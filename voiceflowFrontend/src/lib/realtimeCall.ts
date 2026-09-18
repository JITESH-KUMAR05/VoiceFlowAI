/**
 * The real-time browser turn loop's WebSocket transport.
 *
 * Wraps the raw WebSocket in typed callbacks so callers don't parse frame
 * types themselves. Binary frames are the agent's synthesized speech (raw
 * PCM - see realtimeAudioPlayer.ts); text frames are JSON control messages.
 * Protocol matches backend/app/routers/browser_ws.py's module docstring.
 */

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** Convert http(s):// scheme to ws(s):// - same host, same port, different scheme. */
export function toWebSocketUrl(httpBaseUrl: string): string {
  return httpBaseUrl.replace(/^http/, "ws");
}

/** Construct the full WebSocket URL for a real-time browser call session. */
export function realtimeCallUrl(sessionId: string): string {
  return `${toWebSocketUrl(BASE_URL)}/api/ws/browser/${encodeURIComponent(sessionId)}`;
}

/** Server messages received over the WebSocket connection. */
export type RealtimeServerMessage =
  | { type: "user_transcript"; text: string }
  | { type: "agent_reply"; text: string }
  | { type: "turn_end" }
  | { type: "cancelled" }
  | { type: "error"; detail: string };

/** Callbacks invoked when the RealtimeCallClient receives audio chunks or server messages. */
export interface RealtimeCallHandlers {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onServerMessage: (message: RealtimeServerMessage) => void;
  onClose: () => void;
}

/** WebSocket transport client for real-time browser voice conversation. */
export class RealtimeCallClient {
  private readonly socket: WebSocket;

  /** Initialize the WebSocket connection and attach message handlers. */
  constructor(sessionId: string, handlers: RealtimeCallHandlers) {
    this.socket = new WebSocket(realtimeCallUrl(sessionId));
    this.socket.binaryType = "arraybuffer";

    this.socket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        handlers.onAudioChunk(event.data);
      } else {
        handlers.onServerMessage(
          JSON.parse(event.data as string) as RealtimeServerMessage,
        );
      }
    };
    this.socket.onclose = () => handlers.onClose();
  }

  /** Send data to the server if the socket is open. */
  private send(data: ArrayBufferLike | string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data as ArrayBuffer);
    }
  }

  /** Send one complete utterance: the audio, then the end-of-utterance marker that tells the backend to transcribe and reply to it. */
  sendUtterance(pcm: Int16Array): void {
    this.send(pcm.buffer);
    this.send(JSON.stringify({ type: "utterance_end" }));
  }

  /** Barge-in: abandon whatever reply is currently in flight. */
  cancel(): void {
    this.send(JSON.stringify({ type: "cancel" }));
  }

  /** Close the WebSocket connection. */
  close(): void {
    this.socket.close();
  }
}
