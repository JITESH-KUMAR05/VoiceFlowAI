import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, describeError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  useRealtimeVoiceCall,
  type RealtimeCallState,
} from "@/hooks/useRealtimeVoiceCall";

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

/** Where the visible call currently is: the greeting playing, the
 * continuous VAD turn loop running, or the call wrapped up. */
type Phase = "greeting" | "live" | "ended";

// Keyed on the full display-state union (the hook's states plus "ended")
// rather than a bare `Record<string, string>` - that would let a future
// state added to RealtimeCallState compile with no label here and render a
// blank badge silently. This way it's a compile error instead.
const STATE_LABEL: Record<RealtimeCallState | "ended", string> = {
  connecting: "Connecting",
  listening: "Listening",
  speaking: "You're speaking",
  agent_speaking: "Agent speaking",
  ended: "Call ended",
};

/**
 * Renders one browser-mode call end to end: plays the initial greeting,
 * then hands off to `useRealtimeVoiceCall`'s continuous voice-activity-
 * detection turn loop (no push-to-talk button - the agent listens
 * continuously and can be interrupted mid-reply), and shows the live
 * transcript alongside an end-call control.
 */
export function LiveCallInterface({
  session,
  onEnded,
}: LiveCallInterfaceProps) {
  const [phase, setPhase] = useState<Phase>("greeting");
  const [error, setError] = useState<string | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Stable identity so useRealtimeVoiceCall's effect doesn't tear down and
  // rebuild the mic/socket/audio-context on every render.
  const handleError = useCallback((message: string) => setError(message), []);

  const { state, messages } = useRealtimeVoiceCall({
    sessionId: session.call_sid,
    enabled: phase === "live",
    onError: handleError,
  });

  // Play the greeting once, then switch into the live turn loop.
  useEffect(() => {
    if (!session.greeting_audio_url) {
      setPhase("live");
      return;
    }
    const audio = new Audio(session.greeting_audio_url);
    greetingAudioRef.current = audio;
    audio.onended = () => setPhase("live");
    audio.onerror = () => {
      setError("The greeting could not be played, starting the call anyway.");
      setPhase("live");
    };
    audio.play().catch(() => {
      setError("Playback was blocked - tap anywhere to start the call.");
    });

    return () => audio.pause();
    // Intentionally session-scoped: re-running would replay the greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.call_sid]);

  // Keep the transcript scrolled to the newest line as messages arrive.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // A one-off error (a dropped turn, a transcription failure) shouldn't
  // stay pinned to the screen for the rest of the call once things recover
  // - clear it as soon as another turn actually produces a message
  // (user_transcript or agent_reply are the only two paths that push into
  // `messages`, so any growth here means a turn just succeeded).
  useEffect(() => {
    if (messages.length > 0) setError(null);
  }, [messages]);

  // The transcript should show the greeting from the moment the call
  // starts, not sit blank until the first real turn completes - the
  // greeting is already spoken by the audio played above, this just makes
  // it visible too. Computed rather than seeded into state so it never
  // collides with `messages`, which is owned entirely by the hook.
  const displayMessages = useMemo(
    () =>
      session.greeting
        ? [
            { id: "greeting", role: "agent" as const, text: session.greeting },
            ...messages,
          ]
        : messages,
    [session.greeting, messages],
  );

  /** Stop any playing audio, tell the backend the call is over, and hand
   * off to the caller's post-call handling (scoring/CRM sync toast, etc). */
  const endCall = async () => {
    greetingAudioRef.current?.pause();
    setPhase("ended");
    setError(null);

    try {
      await api.endCall(session.call_sid);
    } catch (cause) {
      setError(
        `The call ended, but the follow-up could not be started: ${describeError(cause)}`,
      );
    }
    onEnded?.();
  };

  const displayState =
    phase === "greeting"
      ? "agent_speaking"
      : phase === "ended"
        ? "ended"
        : state;
  const isLive = phase !== "ended";

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Controls */}
      <div className="panel flex flex-col items-center p-6">
        <div className="mb-6 flex w-full items-center gap-2">
          <span
            className={cn(
              "status-dot",
              displayState === "listening" && "bg-live animate-on-air",
              displayState === "agent_speaking" && "bg-primary",
              displayState === "speaking" && "bg-live",
              displayState === "connecting" && "bg-muted-foreground",
              displayState === "ended" && "bg-border",
            )}
          />
          <span className="label-caps" aria-live="polite">
            {STATE_LABEL[displayState]}
          </span>
        </div>

        <div
          className={cn(
            "mb-6 flex h-24 w-24 items-center justify-center rounded-full border transition-colors",
            displayState === "agent_speaking"
              ? "border-primary/40 bg-primary/10"
              : "border-border bg-muted",
          )}
        >
          {displayState === "connecting" ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Volume2
              className={cn(
                "h-8 w-8",
                displayState === "agent_speaking"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
          )}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={endCall}
          disabled={!isLive}
          aria-label="End the call"
        >
          <PhoneOff />
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {phase === "ended"
            ? "Scoring and CRM sync are running in the background"
            : "Just talk - no button needed. You can interrupt the agent."}
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

        {error && (
          <p
            className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {displayMessages.map((message) => (
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
