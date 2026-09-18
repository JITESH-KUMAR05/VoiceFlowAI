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

  /** Initialize the audio player with an AudioContext (or fake for testing). */
  constructor(private readonly context: AudioContextLike) {}

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
    };
  }

  /** Barge-in: stop everything queued or playing immediately. */
  stop(): void {
    for (const source of this.activeSources) {
      source.stop();
    }
    this.activeSources = [];
    this.nextStartTime = this.context.currentTime;
  }
}
