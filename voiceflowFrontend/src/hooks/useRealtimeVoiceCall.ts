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
 * `onSpeechStart`, `onSpeechEnd`, and the two asset-path overrides below are
 * set here, and the library fills in the rest (model choice, the
 * getUserMedia-backed stream) from its own defaults. Verified against the
 * installed version's `node_modules/@ricky0123/vad-web/dist/real-time-vad.d.ts`.
 * The asset-path overrides are required: in a bundled/ESM context (this
 * app, not the library's `<script src=cdn>` quick-start) `MicVAD.new()`
 * cannot locate `document.currentScript`, so its default `baseAssetPath`/
 * `onnxWASMBasePath` ("./") resolve against this site's own root, which
 * serves nothing there - the ONNX model and WASM files 404 and voice
 * detection never starts. Pointing both at jsDelivr, pinned to the exact
 * installed versions, fixes that.
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
 * backend/app/audio_utils.py expects on the wire. Exported for unit testing
 * (useRealtimeVoiceCall.test.ts) - it has no DOM/AudioContext dependency, so
 * it doesn't need the hook's own runtime to exercise. */
export function floatTo16BitPCM(audio: Float32Array): Int16Array {
  const pcm = new Int16Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    const sample = Math.max(-1, Math.min(1, audio[i]));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return pcm;
}

/**
 * Reassemble one WS binary frame into whole 16-bit PCM samples, carrying
 * any odd trailing byte forward via `pending` for the next chunk.
 *
 * backend/app/services/murf_service.py streams Murf's TTS response through
 * unmodified (`yield from stream`) - each chunk is whatever byte range the
 * underlying HTTP stream buffered, not aligned to 2-byte PCM samples. Most
 * chunks happen to come out even, but an odd-length one is routine, not
 * corruption: `new Int16Array(chunk)` throws "byte length ... should be a
 * multiple of 2" on those (confirmed against a live call, see task-12
 * report), which drops that chunk's audio and spams the console. Carrying
 * the leftover byte into the next chunk instead reassembles the samples
 * losslessly across the split. Exported for unit testing, for the same
 * reason as floatTo16BitPCM above.
 */
export function alignPcmChunk(
  chunk: ArrayBuffer,
  pending: Uint8Array | null,
): { samples: Int16Array; carry: Uint8Array | null } {
  const incoming = new Uint8Array(chunk);
  const combined = pending
    ? new Uint8Array(pending.length + incoming.length)
    : incoming;
  if (pending) {
    combined.set(pending, 0);
    combined.set(incoming, pending.length);
  }
  const evenLength = combined.length - (combined.length % 2);
  const carry = combined.length % 2 === 1 ? combined.slice(evenLength) : null;
  // `combined` is either a fresh, zero-offset Uint8Array (the pending
  // branch) or a zero-offset view straight over `chunk` (no pending) - the
  // resulting byteOffset is always 0, so this Int16Array view is always
  // validly aligned.
  const samples = new Int16Array(
    combined.buffer,
    combined.byteOffset,
    evenLength / 2,
  );
  return { samples, carry };
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
  // True from the moment the client sends an utterance (a turn "starts")
  // until the server says that turn is over - turn_end, error, or a
  // cancelled ack. This tracks the SERVER-side turn only, deliberately
  // separate from whether audio is still audibly playing here (see
  // RealtimeAudioPlayer.isPlaying): Murf synthesizes faster than real time,
  // so turn_end routinely arrives 1-2 seconds before the queued audio
  // finishes playing. Barge-in must stop playback based on isPlaying, but
  // should only send client.cancel() when there's actually a server-side
  // turn left to cancel - this ref is what answers that.
  const turnInFlightRef = useRef(false);
  // True from the moment a barge-in cancels the in-flight reply until the
  // server confirms the cancellation - covers the window where audio
  // chunks the server already wrote to the socket before processing our
  // cancel() are still arriving and must be thrown away, not played.
  const discardingAudioRef = useRef(false);
  // Leftover single byte from the end of the previous audio chunk when its
  // length was odd - see alignPcmChunk. Reset any time the discard flag is,
  // since a stray byte from an abandoned reply must never prefix the next
  // one's audio.
  const pendingAudioByteRef = useRef<Uint8Array | null>(null);

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
    pendingAudioByteRef.current = null;
    turnInFlightRef.current = false;
    const audioContext = new AudioContext();
    // onDrain fires once the agent's audio has actually finished playing
    // (as opposed to turn_end, which only means the server finished
    // streaming it). Only treat that as "done" if the server-side turn has
    // also actually ended - a brief gap between chunks mid-turn can drain
    // the queue momentarily too, and flipping to "listening" then would be
    // wrong; the next chunk's onAudioChunk puts it back to
    // "agent_speaking" regardless, so this just avoids the interim flicker.
    const player = new RealtimeAudioPlayer(audioContext, () => {
      if (!cancelled && !turnInFlightRef.current) setState("listening");
    });

    const client = new RealtimeCallClient(sessionId, {
      // A binary frame is one chunk of the agent's synthesized speech.
      // While a barge-in cancellation is still in flight, the server may
      // have already written chunks to the socket before it saw our
      // cancel() - discard those instead of playing audio back over the
      // caller mid-sentence.
      onAudioChunk: (chunk) => {
        if (discardingAudioRef.current) return;
        setState("agent_speaking");
        const { samples, carry } = alignPcmChunk(
          chunk,
          pendingAudioByteRef.current,
        );
        pendingAudioByteRef.current = carry;
        if (samples.length > 0) player.enqueue(samples);
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
          // The server has finished streaming this turn's audio, but Murf
          // synthesizes faster than real time - RealtimeAudioPlayer is
          // typically still draining 1-2 seconds of already-scheduled
          // audio at this point. Only claim "listening" here if playback
          // has genuinely caught up too; otherwise the player's onDrain
          // callback (above) will flip state once it actually has.
          turnInFlightRef.current = false;
          pendingAudioByteRef.current = null;
          if (!player.isPlaying) setState("listening");
        } else if (message.type === "error") {
          turnInFlightRef.current = false;
          // An error is another legitimate way the client learns the turn
          // is over even if a cancel was outstanding - don't leave the
          // discard flag stuck waiting for a "cancelled" ack that may
          // never come now.
          discardingAudioRef.current = false;
          pendingAudioByteRef.current = null;
          player.stop();
          onErrorRef.current(message.detail);
          setState("listening");
        } else if (message.type === "cancelled") {
          // The server has confirmed the barge-in cancellation - any
          // chunks from the abandoned reply that were already in flight
          // have now been accounted for, so it's safe to accept audio
          // again for the next reply.
          turnInFlightRef.current = false;
          discardingAudioRef.current = false;
          pendingAudioByteRef.current = null;
        }
      },
      onClose: () => {
        if (!cancelled)
          onErrorRef.current("The connection to the agent was lost.");
      },
    });

    let vad: MicVAD | null = null;

    MicVAD.new({
      // Bundled (non-<script src=cdn>) usage can't rely on
      // document.currentScript to locate its own assets, so it falls back
      // to the site's root ("/") and 404s there - nothing in this frontend
      // serves the ONNX model or WASM files locally. Point both at jsDelivr
      // instead, pinned to the exact versions installed
      // (@ricky0123/vad-web and onnxruntime-web in package.json) so the
      // assets actually resolve.
      baseAssetPath:
        "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/",
      onnxWASMBasePath:
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/",
      // The caller started talking - this is a barge-in whenever the agent
      // is still audibly playing, regardless of whether the server-side
      // turn has already finished (turn_end can arrive 1-2 seconds before
      // playback actually drains - see RealtimeAudioPlayer.isPlaying).
      // Stopping playback and cancelling the server turn are two separate
      // decisions: always stop playback if it's still going, but only send
      // cancel() if there's an actual in-flight server turn to abandon -
      // sending it for a turn that already fully finished server-side
      // would be a no-op cancel with nothing to show for it.
      onSpeechStart: () => {
        if (player.isPlaying) {
          player.stop();
        }
        if (turnInFlightRef.current && !discardingAudioRef.current) {
          discardingAudioRef.current = true;
          pendingAudioByteRef.current = null;
          client.cancel();
        }
        setState("speaking");
      },
      // The caller finished a complete utterance - hand it to the backend,
      // mark a server turn as now in flight (cleared on turn_end/error/
      // cancelled), and go back to listening for the next one.
      onSpeechEnd: (audio: Float32Array) => {
        client.sendUtterance(floatTo16BitPCM(audio));
        turnInFlightRef.current = true;
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
