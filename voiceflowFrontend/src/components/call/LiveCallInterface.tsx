import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Brain,
  MessageSquare,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CallStatus = "ringing" | "in-progress" | "completed";
type Sentiment = "positive" | "neutral" | "negative";

interface Message {
  id: string;
  speaker: "ai" | "lead";
  text: string;
  timestamp: string;
}

const mockMessages: Message[] = [
  { id: "1", speaker: "ai", text: "Hello! This is Priya from VoiceFlow AI. Am I speaking with Mr. Sharma?", timestamp: "0:03" },
  { id: "2", speaker: "lead", text: "Yes, this is Sharma speaking. What is this regarding?", timestamp: "0:08" },
  { id: "3", speaker: "ai", text: "Great! I'm calling about our AI-powered voice automation platform that can help businesses like yours automate sales calls and lead qualification. Do you have a moment to discuss?", timestamp: "0:15" },
  { id: "4", speaker: "lead", text: "Actually, we've been looking into such solutions. Tell me more about the pricing.", timestamp: "0:25" },
  { id: "5", speaker: "ai", text: "Wonderful! Our pricing starts at ₹15,000 per month for up to 500 calls. For higher volumes, we offer custom enterprise packages. Would you like me to schedule a demo with our team?", timestamp: "0:38" },
];

const mockObjections = [
  "Price concern detected - Suggest value proposition",
  "Competitor mentioned - Use battle card #3",
];

const mockSuggestions = [
  "Highlight ROI calculator feature",
  "Mention 14-day free trial",
  "Share case study from similar industry",
];

export function LiveCallInterface() {
  const [callStatus, setCallStatus] = useState<CallStatus>("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // Simulate call progression
    const ringTimeout = setTimeout(() => {
      setCallStatus("in-progress");
    }, 2000);

    return () => clearTimeout(ringTimeout);
  }, []);

  useEffect(() => {
    if (callStatus === "in-progress") {
      // Add messages progressively
      mockMessages.forEach((msg, index) => {
        setTimeout(() => {
          setMessages((prev) => [...prev, msg]);
          if (index === 3) setSentiment("positive");
        }, (index + 1) * 2000);
      });

      // Timer
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sentimentConfig = {
    positive: { icon: Smile, color: "text-secondary", bg: "bg-secondary/20" },
    neutral: { icon: Meh, color: "text-primary", bg: "bg-primary/20" },
    negative: { icon: Frown, color: "text-destructive", bg: "bg-destructive/20" },
  };

  const SentimentIcon = sentimentConfig[sentiment].icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Call Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Call Status Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "glass-card p-6",
            callStatus === "ringing" && "border-primary/50 animate-pulse"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center",
                  callStatus === "ringing"
                    ? "bg-primary/20 animate-pulse"
                    : callStatus === "in-progress"
                    ? "bg-secondary/20"
                    : "bg-muted"
                )}
              >
                <Phone
                  className={cn(
                    "h-8 w-8",
                    callStatus === "ringing"
                      ? "text-primary"
                      : callStatus === "in-progress"
                      ? "text-secondary"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {callStatus === "ringing"
                    ? "Connecting..."
                    : callStatus === "in-progress"
                    ? "Call In Progress"
                    : "Call Completed"}
                </h2>
                <p className="text-muted-foreground">Lead: Rajesh Sharma | +91 98765 43210</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold text-foreground">
                {formatDuration(callDuration)}
              </p>
              <Badge
                className={cn(
                  callStatus === "ringing"
                    ? "bg-primary/20 text-primary"
                    : callStatus === "in-progress"
                    ? "bg-secondary/20 text-secondary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {callStatus.replace("-", " ").toUpperCase()}
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Live Transcript */}
        <div className="glass-card p-6 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Live Transcript
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.speaker === "ai" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] p-4 rounded-2xl",
                      message.speaker === "ai"
                        ? "bg-primary/10 rounded-bl-none"
                        : "bg-muted rounded-br-none"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          message.speaker === "ai"
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {message.speaker === "ai" ? "Priya (AI)" : "Lead"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{message.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {callStatus === "in-progress" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm">Listening...</span>
              </div>
            )}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="glass"
            size="lg"
            onClick={() => setIsMuted(!isMuted)}
            className={cn(isMuted && "bg-destructive/20 border-destructive/30")}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            variant="destructive"
            size="xl"
            onClick={() => setCallStatus("completed")}
            className="px-12"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            End Call
          </Button>
          <Button variant="gradient" size="lg">
            <ThumbsUp className="h-5 w-5" />
          </Button>
          <Button variant="glass" size="lg">
            <ThumbsDown className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="space-y-6">
        {/* Sentiment Analysis */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Sentiment</p>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  sentimentConfig[sentiment].bg
                )}
              >
                <SentimentIcon className={cn("h-6 w-6", sentimentConfig[sentiment].color)} />
                <span className={cn("font-medium capitalize", sentimentConfig[sentiment].color)}>
                  {sentiment}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Interest Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: sentiment === "positive" ? "75%" : sentiment === "neutral" ? "50%" : "25%" }}
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {sentiment === "positive" ? "75%" : sentiment === "neutral" ? "50%" : "25%"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Objections Detected */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Objections Detected
          </h3>
          <div className="space-y-3">
            {mockObjections.map((objection, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
              >
                <p className="text-sm text-foreground">{objection}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Suggested Responses */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-secondary" />
            Suggested Responses
          </h3>
          <div className="space-y-3">
            {mockSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="glass"
                className="w-full justify-start text-left h-auto py-3"
              >
                <span className="text-sm">{suggestion}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
