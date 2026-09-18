/**
 * Real-time browser call turn loop.
 *
 * Combines continuous voice-activity detection on the microphone
 * (`@ricky0123/vad-web`'s `MicVAD`), the WebSocket transport to the backend
 * (`RealtimeCallClient`), and gapless playback of the agent's streamed reply
 * (`RealtimeAudioPlayer`) into one state machine: listen for a complete
 * utterance, send it, play back whatever the agent says in response, and if
 * the caller starts talking again mid-reply (barge-in), stop playback and
 * cancel the in-flight reply immediately instead of queuing behind it.
 *
 * `MicVAD.new()`'s options type (`RealTimeVADOptions`) is a large interface
 * covering model selection, audio-worklet wiring, and stream lifecycle, but
 * `MicVAD.new` accepts a `Partial<RealTimeVADOptions>` - only
 * `onSpeechStart` and `onSpeechEnd` are set here, and the library fills in
 * the rest (model, getUserMedia-backed stream, worklet asset paths) from its
 * own defaults. Verified against the installed version's
 * `node_modules/@ricky0123/vad-web/dist/real-time-vad.d.ts`.
 */
import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

import { RealtimeAudioPlayer } from "@/lib/realtimeAudioPlayer";
import {
  RealtimeCallClient,
  type RealtimeServerMessage,
} from "@/lib/realtimeCall";

/** Where the turn loop currently is: waiting to connect, waiting for the
 * caller to speak, the caller mid-utterance, or the agent's reply playing. */
export type RealtimeCallState =
  | "connecting"
  | "listening"
  | "speaking"
  | "agent_speaking";

/** One line of the visible transcript - either what the caller said or what
 * the agent replied. */
export interface RealtimeMessage {
  id: string;
  role: "user" | "agent";
  text: string;
}

interface UseRealtimeVoiceCallOptions {
  sessionId: string;
  /** Whether the turn loop (mic capture, VAD, WebSocket) should be running.
   * The caller controls this - e.g. to hold off starting the mic until an
   * initial greeting has finished playing. */
  enabled: boolean;
  onError: (message: string) => void;
}

let messageCounter = 0;
/** Generate a locally-unique id for a transcript line (server messages
 * don't carry one). */
const nextId = () => `rm${++messageCounter}`;

/** Float32 samples in [-1, 1] -> 16-bit signed PCM, matching what
 * backend/app/audio_utils.py expects on the wire. */
function floatTo16BitPCM(audio: Float32Array): Int16Array {
  const pcm = new Int16Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    const sample = Math.max(-1, Math.min(1, audio[i]));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return pcm;
}

/**
 * Drives one browser call's turn loop: continuous voice-activity detection,
 * a persistent WebSocket to the backend, and gapless playback of the
 * agent's streamed reply - with barge-in, so speaking over the agent
 * interrupts it instead of queuing behind it.
 */
export function useRealtimeVoiceCall({
  sessionId,
  enabled,
  onError,
}: UseRealtimeVoiceCallOptions) {
  const [state, setState] = useState<RealtimeCallState>("connecting");
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const isAgentSpeakingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const audioContext = new AudioContext();
    const player = new RealtimeAudioPlayer(audioContext);

    const client = new RealtimeCallClient(sessionId, {
      // A binary frame is one chunk of the agent's synthesized speech -
      // queue it for gapless playback and reflect that the agent is
      // talking so a barge-in knows to interrupt it.
      onAudioChunk: (chunk) => {
        isAgentSpeakingRef.current = true;
        setState("agent_speaking");
        player.enqueue(new Int16Array(chunk));
      },
      // A text frame is a JSON control message - append transcript lines,
      // or react to the turn ending, erroring, or being cancelled.
      onServerMessage: (message: RealtimeServerMessage) => {
        if (message.type === "user_transcript") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "user", text: message.text },
          ]);
        } else if (message.type === "agent_reply") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "agent", text: message.text },
          ]);
        } else if (message.type === "turn_end") {
          isAgentSpeakingRef.current = false;
          setState("listening");
        } else if (message.type === "error") {
          isAgentSpeakingRef.current = false;
          onError(message.detail);
          setState("listening");
        }
        // "cancelled" needs no UI reaction - the barge-in already stopped
        // playback locally the moment speech was detected.
      },
      onClose: () => {
        if (!cancelled) onError("The connection to the agent was lost.");
      },
    });

    let vad: MicVAD | null = null;

    MicVAD.new({
      // The caller started talking. If the agent's reply is still
      // playing, this is a barge-in: stop local playback and tell the
      // backend to abandon the in-flight reply before it wastes more
      // tokens/audio on something no one will hear.
      onSpeechStart: () => {
        if (isAgentSpeakingRef.current) {
          player.stop();
          isAgentSpeakingRef.current = false;
          client.cancel();
        }
        setState("speaking");
      },
      // The caller finished a complete utterance - hand it to the backend
      // and go back to listening for the next one.
      onSpeechEnd: (audio: Float32Array) => {
        client.sendUtterance(floatTo16BitPCM(audio));
        setState("listening");
      },
    })
      .then((instance) => {
        if (cancelled) {
          void instance.destroy();
          return;
        }
        vad = instance;
        void vad.start();
        setState("listening");
      })
      .catch(() => {
        onError("Microphone access is needed for a live conversation.");
      });

    // Effect cleanup: tear everything down when the hook is disabled or
    // unmounted, so a stale mic/socket/audio-context never outlives the
    // component that started it.
    return () => {
      cancelled = true;
      void vad?.destroy();
      client.close();
      player.stop();
      void audioContext.close();
    };
  }, [sessionId, enabled, onError]);

  return { state, messages };
}
