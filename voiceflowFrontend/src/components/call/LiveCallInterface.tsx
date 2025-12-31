import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2, PhoneOff } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

interface LiveCallInterfaceProps {
  session: {
    call_sid: string;
    greeting: string;
    greeting_audio_url: string;
    lead_name: string;
    language?: string;
  };
}

export function LiveCallInterface({ session }: LiveCallInterfaceProps) {
  const [status, setStatus] = useState<"idle" | "speaking" | "listening" | "processing">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // 1. Initialize & Play Greeting
  useEffect(() => {
    // Add greeting to chat
    setMessages([{ id: "init", role: "ai", text: session.greeting }]);
    
    // Play Greeting Audio
    if (session.greeting_audio_url) {
      playAudio(session.greeting_audio_url);
    }

    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = session.language || 'en-IN'; 

        recognitionRef.current.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
        };

        recognitionRef.current.onend = () => {
            // If we have text, send it. If not, just go idle.
            // We handle the "send" logic in a separate effect or check transcript here
        };
    }

    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // 2. Handle Transcript Finalization
  useEffect(() => {
    if (status === "listening" && transcript) {
        // Simple debounce or wait for silence could go here
        // For now, we rely on the user clicking "Stop" or the engine stopping
    }
  }, [transcript]);

  // Helper: Play Audio
  const playAudio = (url: string) => {
    setStatus("speaking");
    if (audioRef.current) audioRef.current.pause();
    
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => {
      setStatus("listening");
      startListening();
    };
    audioRef.current.play().catch(e => console.error("Audio play error:", e));
  };

  // Helper: Start Listening
  const startListening = () => {
    setTranscript("");
    try {
        recognitionRef.current?.start();
        setStatus("listening");
    } catch (e) {
        console.log("Already started or error", e);
    }
  };

  // Helper: Stop Listening & Send
  const handleStopListening = async () => {
    if (!transcript) return;
    
    recognitionRef.current?.stop();
    setStatus("processing");
    
    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: transcript };
    setMessages(prev => [...prev, userMsg]);

    try {
        const response = await fetch("http://localhost:8000/api/browser/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: session.call_sid,
                message: transcript
            })
        });

        const data = await response.json();
        
        // Add AI Message
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: data.text }]);
        
        // Play Response
        if (data.audio_url) {
            playAudio(data.audio_url);
        } else {
            setStatus("idle");
        }

    } catch (error) {
        console.error("Chat error", error);
        setStatus("idle");
    }
  };

  // [NEW] Handle End Call
  const handleEndCall = async () => {
    if (audioRef.current) audioRef.current.pause();
    if (recognitionRef.current) recognitionRef.current.stop();
    setStatus("idle");

    try {
        await fetch("http://localhost:8000/api/browser/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: session.call_sid,
                message: "END_CALL"
            })
        });
        alert("Call Ended. Check Salesforce & Email for updates!");
        window.location.reload(); // Reset for next demo
    } catch (error) {
        console.error("Error ending call:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
      
      {/* Left: Visualizer & Controls */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* Status Indicator */}
        <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", 
                status === "speaking" ? "bg-green-500 animate-pulse" : 
                status === "listening" ? "bg-red-500 animate-pulse" : "bg-gray-500"
            )} />
            <span className="text-sm font-medium capitalize text-muted-foreground">{status}</span>
        </div>

        {/* Avatar / Visualizer */}
        <div className="relative mb-8">
            <div className={cn("w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
                status === "speaking" ? "bg-primary/20 scale-110" : "bg-muted"
            )}>
                <Volume2 className={cn("w-12 h-12", status === "speaking" ? "text-primary" : "text-muted-foreground")} />
            </div>
            {/* Ripple effects */}
            {status === "speaking" && (
                <>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    <div className="absolute -inset-4 rounded-full border border-primary/10 animate-pulse" />
                </>
            )}
        </div>

        {/* Transcript Display (Live) */}
        <div className="h-16 text-center mb-8 w-full px-4">
            {status === "listening" && (
                <p className="text-lg text-foreground font-medium animate-pulse">
                    {transcript || "Listening..."}
                </p>
            )}
            {status === "processing" && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing response...
                </div>
            )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
            {/* Mic Controls */}
            {status === "listening" ? (
                <Button 
                    size="lg" 
                    variant="destructive" 
                    className="rounded-full h-16 w-16"
                    onClick={handleStopListening}
                >
                    <MicOff className="w-6 h-6" />
                </Button>
            ) : (
                <Button 
                    size="lg" 
                    variant="secondary" 
                    className="rounded-full h-16 w-16"
                    onClick={startListening}
                    disabled={status === "processing" || status === "speaking"}
                >
                    <Mic className="w-6 h-6" />
                </Button>
            )}

            {/* [NEW] End Call Button */}
            <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full h-16 w-16 border-red-500 text-red-500 hover:bg-red-50"
                onClick={handleEndCall}
            >
                <PhoneOff className="w-6 h-6" />
            </Button>
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground">
            {status === "listening" ? "Tap to send" : "Tap to speak"}
        </p>
      </div>

      {/* Right: Chat History */}
      <div className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 p-2">
            {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm",
                        msg.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-card border border-border rounded-tl-none"
                    )}>
                        {msg.text}
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}