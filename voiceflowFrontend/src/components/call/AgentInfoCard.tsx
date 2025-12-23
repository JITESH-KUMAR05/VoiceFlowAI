import { motion } from "framer-motion";
import { User, Target, Mic, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentInfoCardProps {
  agentName: string;
  purpose: string;
  voice: string;
  languages: string[];
  variant: "primary" | "secondary";
}

export function AgentInfoCard({
  agentName,
  purpose,
  voice,
  languages,
  variant,
}: AgentInfoCardProps) {
  const isPrimary = variant === "primary";

  const infoItems = [
    { icon: User, label: "Agent Name", value: agentName },
    { icon: Target, label: "Purpose", value: purpose },
    { icon: Mic, label: "Voice", value: voice },
    { icon: Globe, label: "Languages", value: languages.join(", ") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "glass-card p-6 relative overflow-hidden",
        isPrimary ? "border-primary/20" : "border-secondary/20"
      )}
    >
      {/* Gradient accent */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isPrimary
            ? "bg-gradient-to-r from-primary to-cyan-400"
            : "bg-gradient-to-r from-secondary to-emerald-400"
        )}
      />

      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isPrimary ? "bg-primary" : "bg-secondary"
          )}
        />
        About This Agent
      </h3>

      <div className="space-y-4">
        {infoItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                isPrimary ? "bg-primary/10" : "bg-secondary/10"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4",
                  isPrimary ? "text-primary" : "text-secondary"
                )}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium text-foreground">{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
