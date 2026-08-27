import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, describeError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
}

/** Where the turn loop currently is. */
type CallState =
  | "connecting"
  | "speaking" // the agent is talking
  | "listening" // waiting on the caller
  | "processing" // model and synthesis in flight
  | "ended";

interface LiveCallInterfaceProps {
  session: {
    call_sid: string;
    greeting: string;
    greeting_audio_url: string | null;
    lead_name: string;
    language?: string;
  };
  /** Called once the post-call pipeline has been handed off. */
  onEnded?: () => void;
}

const STATE_LABEL: Record<CallState, string> = {
  connecting: "Connecting",
  speaking: "Agent speaking",
  listening: "Listening",
  processing: "Thinking",
  ended: "Call ended",
};

function speechRecognitionSupported(): boolean {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

let messageCounter = 0;
const nextId = () => `m${++messageCounter}`;

export function LiveCallInterface({
  session,
  onEnded,
}: LiveCallInterfaceProps) {
  const [state, setState] = useState<CallState>("connecting");
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "agent", text: session.greeting },
  ]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(speechRecognitionSupported);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  // Read inside audio callbacks, which are registered once and would
  // otherwise close over a stale value.
  const stateRef = useRef<CallState>("connecting");
  stateRef.current = state;

  const startListening = useCallback(() => {
    if (!recognitionRef.current || stateRef.current === "ended") return;
    setTranscript("");
    try {
      recognitionRef.current.start();
      setState("listening");
    } catch {
      // start() throws if recognition is already running, which is harmless.
    }
  }, []);

  const playAudio = useCallback(
    (url: string) => {
      audioRef.current?.pause();

      const audio = new Audio(url);
      audioRef.current = audio;
      setState("speaking");

      audio.onended = () => {
        if (stateRef.current !== "ended") startListening();
      };
      audio.onerror = () => {
        setError("The agent's audio could not be played. You can still type.");
        if (stateRef.current !== "ended") startListening();
      };

      audio.play().catch(() => {
        // Browsers block autoplay until the page has been interacted with.
        setError("Playback was blocked. Press the microphone to continue.");
        setState("listening");
      });
    },
    [startListening],
  );

  // Set up recognition and play the greeting. Runs once per session.
  useEffect(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = session.language ?? "en-IN";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        setTranscript(event.results[event.resultIndex][0].transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // "aborted" and "no-speech" are routine, not worth interrupting for.
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setError(
            "Microphone access was denied. Allow it in your browser to speak to the agent.",
          );
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          setError(`Speech recognition failed: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    }

    if (session.greeting_audio_url) {
      playAudio(session.greeting_audio_url);
    } else {
      setState("listening");
    }

    return () => {
      audioRef.current?.pause();
      recognitionRef.current?.abort();
    };
    // Intentionally session-scoped: re-running would replay the greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.call_sid]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const spoken = transcript.trim();
    if (!spoken) {
      // Nothing was captured; drop back rather than leaving the mic "on".
      recognitionRef.current?.stop();
      setState("listening");
      return;
    }

    recognitionRef.current?.stop();
    setState("processing");
    setError(null);
    setTranscript("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: spoken },
    ]);

    try {
      const reply = await api.sendMessage(session.call_sid, spoken);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "agent", text: reply.text },
      ]);

      if (reply.audio_url) {
        playAudio(reply.audio_url);
      } else {
        startListening();
      }
    } catch (cause) {
      setError(describeError(cause));
      setState("listening");
    }
  };

  const endCall = async () => {
    audioRef.current?.pause();
    recognitionRef.current?.abort();
    setState("ended");
    setError(null);

    try {
      await api.endCall(session.call_sid);
    } catch (cause) {
      // The conversation is over either way; say what did not happen.
      setError(
        `The call ended, but the follow-up could not be started: ${describeError(cause)}`,
      );
    }
    onEnded?.();
  };

  const isLive = state !== "ended";

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Controls */}
      <div className="panel flex flex-col items-center p-6">
        <div className="mb-6 flex w-full items-center gap-2">
          <span
            className={cn(
              "status-dot",
              state === "listening" && "bg-live animate-on-air",
              state === "speaking" && "bg-primary",
              state === "processing" && "bg-muted-foreground",
              state === "connecting" && "bg-muted-foreground",
              state === "ended" && "bg-border",
            )}
          />
          <span className="label-caps" aria-live="polite">
            {STATE_LABEL[state]}
          </span>
        </div>

        <div
          className={cn(
            "mb-6 flex h-24 w-24 items-center justify-center rounded-full border transition-colors",
            state === "speaking"
              ? "border-primary/40 bg-primary/10"
              : "border-border bg-muted",
          )}
        >
          {state === "processing" ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Volume2
              className={cn(
                "h-8 w-8",
                state === "speaking" ? "text-primary" : "text-muted-foreground",
              )}
            />
          )}
        </div>

        <div className="mb-6 flex min-h-12 w-full items-center justify-center px-2 text-center">
          {state === "listening" && (
            <p className="text-sm" aria-live="polite">
              {transcript || (
                <span className="text-muted-foreground">Say something…</span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {state === "listening" ? (
            <Button size="icon" onClick={send} aria-label="Send what you said">
              <MicOff />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="secondary"
              onClick={startListening}
              disabled={!isLive || !supported || state !== "speaking"}
              aria-label="Speak"
            >
              <Mic />
            </Button>
          )}

          <Button
            size="icon"
            variant="outline"
            onClick={endCall}
            disabled={!isLive}
            aria-label="End the call"
          >
            <PhoneOff />
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {state === "listening"
            ? "Press to send what you said"
            : state === "ended"
              ? "Scoring and CRM sync are running in the background"
              : "Wait for the agent to finish"}
        </p>
      </div>

      {/* Transcript */}
      <div className="panel flex h-[28rem] flex-col p-4">
        <h2 className="label-caps mb-3">
          Transcript &middot;{" "}
          <span className="font-mono normal-case">
            {session.call_sid.slice(0, 8)}
          </span>
        </h2>

        {!supported && (
          <p
            className="mb-3 rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
            role="status"
          >
            This browser has no speech recognition. Browser calls need a
            Chromium-based browser.
          </p>
        )}

        {error && (
          <p
            className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-md px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted",
                )}
              >
                <span className="label-caps mb-0.5 block opacity-70">
                  {message.role === "user" ? session.lead_name : "Agent"}
                </span>
                {message.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}
