import { motion } from "framer-motion";
import { Check, ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  title: string;
  description: string;
  features: string[];
  tags: string[];
  ctaText: string;
  ctaLink: string;
  icon: LucideIcon;
  variant: "primary" | "secondary";
}

export function AgentCard({
  title,
  description,
  features,
  tags,
  ctaText,
  ctaLink,
  icon: Icon,
  variant,
}: AgentCardProps) {
  const isPrimary = variant === "primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative group overflow-hidden rounded-2xl border p-8",
        "bg-gradient-to-b from-card to-card/50 backdrop-blur-xl",
        isPrimary ? "border-primary/20 hover:border-primary/40" : "border-secondary/20 hover:border-secondary/40"
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          isPrimary
            ? "bg-gradient-to-br from-primary/5 to-transparent"
            : "bg-gradient-to-br from-secondary/5 to-transparent"
        )}
      />

      {/* Glow effect */}
      <div
        className={cn(
          "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100",
          isPrimary ? "bg-primary/20" : "bg-secondary/20"
        )}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl shadow-lg",
              isPrimary
                ? "bg-gradient-to-br from-primary to-cyan-400"
                : "bg-gradient-to-br from-secondary to-emerald-400"
            )}
          >
            <Icon className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-foreground mb-1">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  isPrimary ? "bg-primary/20" : "bg-secondary/20"
                )}
              >
                <Check
                  className={cn(
                    "h-3 w-3",
                    isPrimary ? "text-primary" : "text-secondary"
                  )}
                />
              </div>
              <span className="text-sm text-foreground/80">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full border",
                isPrimary
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-secondary/10 border-secondary/20 text-secondary"
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <Link to={ctaLink}>
          <Button
            variant={isPrimary ? "gradient" : "gradient-secondary"}
            size="lg"
            className="w-full group/btn"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
