import { motion } from "framer-motion";
import { Eye, Calendar, Clock, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CallRecord {
  id: string;
  leadName: string;
  email: string;
  callDate: string;
  callTime: string;
  interestLevel: "high" | "medium" | "low" | "none";
  duration: string;
  status: "completed" | "follow-up" | "missed";
  nextAction: string;
}

interface CallTableProps {
  calls: CallRecord[];
  onViewCall: (id: string) => void;
}

const interestColors = {
  high: "bg-secondary/20 text-secondary border-secondary/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  none: "bg-muted text-muted-foreground border-border",
};

const statusColors = {
  completed: "bg-secondary/20 text-secondary",
  "follow-up": "bg-primary/20 text-primary",
  missed: "bg-destructive/20 text-destructive",
};

export function CallTable({ calls, onViewCall }: CallTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Interest
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Next Action
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {calls.map((call, index) => (
              <motion.tr
                key={call.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-accent/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{call.leadName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {call.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {call.callDate}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {call.callTime}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", interestColors[call.interestLevel])}
                  >
                    {call.interestLevel}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-foreground">{call.duration}</span>
                </td>
                <td className="px-6 py-4">
                  <Badge className={cn("capitalize", statusColors[call.status])}>
                    {call.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">{call.nextAction}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewCall(call.id)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
