import { motion } from "framer-motion";
import { User, Target, Mic, Globe, Briefcase, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentInfoCardProps {
  agentName: string;
  agentRole?: string;
  purpose: string;
  voice: string;
  languages: string[];
  features?: string[];
  variant: "primary" | "secondary";
}

export function AgentInfoCard({
  agentName,
  agentRole,
  purpose,
  voice,
  languages,
  features,
  variant,
}: AgentInfoCardProps) {
  const isPrimary = variant === "primary";

  const infoItems = [
    { icon: User, label: "Agent Name", value: agentRole ? `${agentName} (${agentRole})` : agentName },
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

      {/* Features List */}
      {features && features.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Briefcase className={cn("h-4 w-4", isPrimary ? "text-primary" : "text-secondary")} />
            Key Capabilities
          </h4>
          <div className="space-y-2">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle className={cn("h-3.5 w-3.5", isPrimary ? "text-primary" : "text-secondary")} />
                {feature}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
