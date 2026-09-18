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
  "connecting" | "listening" | "speaking" | "agent_speaking";

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
  // True from the moment a barge-in cancels the in-flight reply until the
  // server confirms the cancellation - covers the window where audio
  // chunks the server already wrote to the socket before processing our
  // cancel() are still arriving and must be thrown away, not played.
  const discardingAudioRef = useRef(false);

  // Keep the latest onError in a ref rather than the main effect's
  // dependency array. Task 12 will pass an inline arrow function, which is
  // a new value on every render - depending on it directly would tear down
  // and rebuild the AudioContext/WebSocket/mic stream on every parent
  // re-render instead of only when the call itself changes.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    // Reset for this run of the effect - if the previous run tore down
    // (socket died mid-reply with no reconnect, or `enabled`/`sessionId`
    // changed) while a barge-in's cancel() was still outstanding, a stale
    // `true` here would otherwise discard every chunk of the new call
    // forever, since nothing but a "cancelled" ack on the old socket would
    // ever have cleared it.
    discardingAudioRef.current = false;
    const audioContext = new AudioContext();
    const player = new RealtimeAudioPlayer(audioContext);

    const client = new RealtimeCallClient(sessionId, {
      // A binary frame is one chunk of the agent's synthesized speech.
      // While a barge-in cancellation is still in flight, the server may
      // have already written chunks to the socket before it saw our
      // cancel() - discard those instead of playing audio back over the
      // caller mid-sentence.
      onAudioChunk: (chunk) => {
        if (discardingAudioRef.current) return;
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
          // An error is another legitimate way the client learns the turn
          // is over even if a cancel was outstanding - don't leave the
          // discard flag stuck waiting for a "cancelled" ack that may
          // never come now.
          discardingAudioRef.current = false;
          player.stop();
          onErrorRef.current(message.detail);
          setState("listening");
        } else if (message.type === "cancelled") {
          // The server has confirmed the barge-in cancellation - any
          // chunks from the abandoned reply that were already in flight
          // have now been accounted for, so it's safe to accept audio
          // again for the next reply.
          discardingAudioRef.current = false;
        }
      },
      onClose: () => {
        if (!cancelled)
          onErrorRef.current("The connection to the agent was lost.");
      },
    });

    let vad: MicVAD | null = null;

    MicVAD.new({
      // The caller started talking. If the agent's reply is still
      // playing, this is a barge-in: stop local playback, discard any
      // reply audio already in flight, and tell the backend to abandon
      // the in-flight reply before it wastes more tokens/audio on
      // something no one will hear.
      onSpeechStart: () => {
        if (isAgentSpeakingRef.current) {
          player.stop();
          isAgentSpeakingRef.current = false;
          discardingAudioRef.current = true;
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
      .catch((error: unknown) => {
        // MicVAD.new() awaits its own start() internally (startOnLoad
        // defaults to true), so this one catch covers mic permission
        // denial, onnx model fetch failures, AudioWorklet load failures,
        // and wasm load failures alike - don't assert a specific cause we
        // can't confirm from here.
        console.error("MicVAD failed to start:", error);
        onErrorRef.current(
          "Could not start voice detection - check the console for details.",
        );
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
  }, [sessionId, enabled]);

  return { state, messages };
}
