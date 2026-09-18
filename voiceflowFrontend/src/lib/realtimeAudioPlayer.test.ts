import { describe, expect, it } from "vitest";

import {
  RealtimeAudioPlayer,
  type AudioContextLike,
} from "./realtimeAudioPlayer";

class FakeBufferSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  started: number[] = [];
  stopped = false;

  connect() {
    /* no-op */
  }

  start(when: number) {
    this.started.push(when);
  }

  stop() {
    this.stopped = true;
  }
}

function fakeContext(
  currentTime = 0,
): AudioContextLike & { sources: FakeBufferSource[] } {
  const sources: FakeBufferSource[] = [];
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    sources,
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return {
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      } as unknown as AudioBuffer;
    },
    createBufferSource() {
      const source = new FakeBufferSource();
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    },
  };
}

describe("RealtimeAudioPlayer", () => {
  it("schedules the first chunk to start immediately", () => {
    const context = fakeContext(1.5);
    const player = new RealtimeAudioPlayer(context);

    player.enqueue(new Int16Array([0, 100, -100]));

    expect(context.sources[0].started).toEqual([1.5]);
  });

  it("schedules the second chunk right after the first ends, not at currentTime", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);

    // 24000 samples at 24kHz = exactly 1 second of audio.
    player.enqueue(new Int16Array(24_000));
    player.enqueue(new Int16Array(12_000));

    expect(context.sources[0].started).toEqual([0]);
    expect(context.sources[1].started).toEqual([1]);
  });

  it("stop() halts every scheduled source and resets the queue clock", () => {
    const context = fakeContext(2);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(24_000));

    player.stop();

    expect(context.sources[0].stopped).toBe(true);

    player.enqueue(new Int16Array(100));
    expect(context.sources[1].started).toEqual([2]);
  });
});

// Regression coverage for the barge-in bug this fix round exists for: the
// server's turn_end arrives as soon as it has streamed every chunk, but
// Murf synthesizes faster than real time, so multiple seconds of audio are
// routinely still scheduled/playing here when that happens. isPlaying is
// what useRealtimeVoiceCall now checks instead of a turn_end-driven flag.
describe("RealtimeAudioPlayer.isPlaying", () => {
  it("is false before anything has ever been enqueued", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);

    expect(player.isPlaying).toBe(false);
  });

  it("is true immediately after enqueuing audio that hasn't finished yet", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);

    // 24000 samples at 24kHz = 1 second of audio, ending at t=1.
    player.enqueue(new Int16Array(24_000));

    expect(player.isPlaying).toBe(true);
  });

  it("stays true while the context clock is still short of the queue's end - the turn_end-arrives-early scenario", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(24_000)); // scheduled to end at t=1

    // The server has finished streaming (turn_end) at t=0, but playback
    // has 1 full second left to run - this is exactly the gap the bug
    // exploited: a caller who starts talking here must still interrupt.
    context.currentTime = 0;
    expect(player.isPlaying).toBe(true);

    context.currentTime = 0.999;
    expect(player.isPlaying).toBe(true);
  });

  it("is false once the context clock has caught up to the end of the queue", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(24_000)); // ends at t=1

    context.currentTime = 1;

    expect(player.isPlaying).toBe(false);
  });

  it("returns to true if another chunk is enqueued after the queue had drained", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(24_000));
    context.currentTime = 1;
    expect(player.isPlaying).toBe(false);

    player.enqueue(new Int16Array(100));

    expect(player.isPlaying).toBe(true);
  });
});

describe("RealtimeAudioPlayer onDrain", () => {
  it("fires once the last scheduled source's onended callback runs naturally", () => {
    const context = fakeContext(0);
    let drainCount = 0;
    const player = new RealtimeAudioPlayer(context, () => {
      drainCount++;
    });
    player.enqueue(new Int16Array(100));
    expect(drainCount).toBe(0);

    context.sources[0].onended?.();

    expect(drainCount).toBe(1);
  });

  it("does not fire until every queued source has ended", () => {
    const context = fakeContext(0);
    let drainCount = 0;
    const player = new RealtimeAudioPlayer(context, () => {
      drainCount++;
    });
    player.enqueue(new Int16Array(100));
    player.enqueue(new Int16Array(100));

    context.sources[0].onended?.();
    expect(drainCount).toBe(0);

    context.sources[1].onended?.();
    expect(drainCount).toBe(1);
  });

  it("does not fire when playback is interrupted via stop() - only a naturally-finished queue counts as drained", () => {
    const context = fakeContext(0);
    let drainCount = 0;
    const player = new RealtimeAudioPlayer(context, () => {
      drainCount++;
    });
    player.enqueue(new Int16Array(100));

    player.stop();

    expect(drainCount).toBe(0);
    // stop() detaches onended precisely so a late/async "ended" event from
    // the now-stopped source can't fire the drain callback afterwards.
    expect(context.sources[0].onended).toBeNull();
  });

  it("is optional - enqueue and stop work with no onDrain callback supplied", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(100));

    expect(() => context.sources[0].onended?.()).not.toThrow();
    expect(() => player.stop()).not.toThrow();
  });
});
