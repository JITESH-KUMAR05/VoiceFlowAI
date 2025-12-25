import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, Building2, MapPin, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, AgentType } from "@/types/agent";

interface UserCardProps {
  user: User;
  agentType: AgentType;
  index: number;
}

const interestColors = {
  high: "bg-secondary/20 text-secondary",
  medium: "bg-primary/20 text-primary",
  low: "bg-yellow-500/20 text-yellow-500",
  none: "bg-muted text-muted-foreground",
};

const statusColors = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-primary/20 text-primary",
  qualified: "bg-secondary/20 text-secondary",
  converted: "bg-emerald-500/20 text-emerald-400",
  lost: "bg-destructive/20 text-destructive",
};

export function UserCard({ user, agentType, index }: UserCardProps) {
  const basePath = agentType === "b2b" ? "/b2b" : "/real-estate";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 hover:border-border transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{user.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn("capitalize", interestColors[user.interestLevel])}>
              {user.interestLevel} interest
            </Badge>
            <Badge className={cn("capitalize", statusColors[user.status])}>
              {user.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span>{user.phone}</span>
        </div>
        {user.company && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{user.company}</span>
          </div>
        )}
        {user.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{user.location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">
          Last contact: {user.lastContactedAt || "Never"}
        </span>
        <Link to={`${basePath}/crm/user/${user.id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            View Details
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
