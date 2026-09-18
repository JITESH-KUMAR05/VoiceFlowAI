/**
 * Gapless playback of raw 16-bit PCM chunks as they arrive over the
 * WebSocket, instead of waiting for a complete audio file. Chunks are
 * scheduled back-to-back on the Web Audio API's own clock, so there's no
 * gap between them even though each one is a separate buffer.
 */

// Must match backend/app/services/murf_service.py's SAMPLE_RATE_HZ - the
// backend requests raw PCM at this rate for the real-time path.
export const AGENT_AUDIO_SAMPLE_RATE_HZ = 24_000;

/** The subset of AudioContext this class needs - narrowed so tests can
 * supply a fake instead of a real one (jsdom has no Web Audio API). */
export interface AudioContextLike {
  currentTime: number;
  destination: AudioDestinationNode;
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
}

export class RealtimeAudioPlayer {
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  /**
   * Initialize the audio player with an AudioContext (or fake for testing).
   *
   * @param onDrain Optional callback invoked when the last actively-scheduled
   *   source finishes playing naturally (the queue has fully drained back to
   *   silence). It is deliberately NOT invoked by `stop()` - an explicit stop
   *   is an interruption (barge-in or teardown), not the "reply finished
   *   playing" event this signals, and firing it there could flip caller
   *   state (e.g. back to "listening") after the caller has already moved on
   *   to speaking. Used by useRealtimeVoiceCall to know when the agent's
   *   audio has actually finished playing, as opposed to when the server has
   *   merely finished streaming it (`turn_end`) - Murf synthesizes faster
   *   than real time, so those two moments are routinely 1-2 seconds apart.
   */
  constructor(
    private readonly context: AudioContextLike,
    private readonly onDrain?: () => void,
  ) {}

  /**
   * Whether audio is still scheduled to be audibly playing right now - i.e.
   * the queue's own clock (`nextStartTime`) is still ahead of the context's
   * real clock. Chunks are scheduled back-to-back ahead of real time (see
   * `enqueue`), so the server can finish streaming a reply (and send
   * `turn_end`) while multiple seconds of already-scheduled audio are still
   * queued or audibly playing here - callers that need to know whether the
   * agent is still *audibly speaking* (as opposed to whether the server has
   * finished generating) must check this rather than relying on `turn_end`.
   */
  get isPlaying(): boolean {
    return this.nextStartTime > this.context.currentTime;
  }

  /** Queue one chunk of PCM samples to play right after whatever is
   * already queued - not necessarily right now. */
  enqueue(pcm: Int16Array): void {
    const buffer = this.context.createBuffer(
      1,
      pcm.length,
      AGENT_AUDIO_SAMPLE_RATE_HZ,
    );
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 32768;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const startAt = Math.max(this.nextStartTime, this.context.currentTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      // The queue has drained - either genuinely finished, or there's a
      // brief gap before the next chunk arrives mid-turn. The latter is a
      // harmless false-positive: the caller's next chunk re-enters
      // "agent_speaking" on its own, so it's not worth distinguishing here.
      if (this.activeSources.length === 0) this.onDrain?.();
    };
  }

  /** Barge-in (or teardown): stop everything queued or playing immediately. */
  stop(): void {
    for (const source of this.activeSources) {
      // Detach onended before stopping - see the onDrain doc comment above.
      // Without this, the browser's async "ended" event for a just-stopped
      // source would still fire the drain check later.
      source.onended = null;
      source.stop();
    }
    this.activeSources = [];
    this.nextStartTime = this.context.currentTime;
  }
}
