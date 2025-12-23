import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  variant?: "default" | "primary" | "secondary";
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="glass-card p-6 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
            variant === "primary"
              ? "bg-primary/10 group-hover:bg-primary/20"
              : variant === "secondary"
              ? "bg-secondary/10 group-hover:bg-secondary/20"
              : "bg-muted group-hover:bg-muted/80"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              variant === "primary"
                ? "text-primary"
                : variant === "secondary"
                ? "text-secondary"
                : "text-muted-foreground"
            )}
          />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              changeType === "positive"
                ? "bg-secondary/10 text-secondary"
                : changeType === "negative"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
    </motion.div>
  );
}
