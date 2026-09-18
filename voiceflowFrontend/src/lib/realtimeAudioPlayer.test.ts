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
