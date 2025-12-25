import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Call } from "@/types/agent";

interface CallsTableProps {
  calls: Call[];
  onViewCall: (id: string) => void;
}

const interestColors = {
  high: "bg-secondary/20 text-secondary",
  medium: "bg-primary/20 text-primary",
  low: "bg-yellow-500/20 text-yellow-500",
  none: "bg-muted text-muted-foreground",
};

const statusColors = {
  completed: "bg-secondary/20 text-secondary",
  "follow-up": "bg-primary/20 text-primary",
  missed: "bg-destructive/20 text-destructive",
};

export function CallsTable({ calls, onViewCall }: CallsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Lead Name</TableHead>
            <TableHead className="text-muted-foreground">Email</TableHead>
            <TableHead className="text-muted-foreground">Date & Time</TableHead>
            <TableHead className="text-muted-foreground">Interest</TableHead>
            <TableHead className="text-muted-foreground">Duration</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Next Action</TableHead>
            <TableHead className="text-muted-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call, index) => (
            <motion.tr
              key={call.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-border hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium text-foreground">
                {call.leadName}
              </TableCell>
              <TableCell className="text-muted-foreground">{call.email}</TableCell>
              <TableCell className="text-muted-foreground">
                <div>{call.callDate}</div>
                <div className="text-xs">{call.callTime}</div>
              </TableCell>
              <TableCell>
                <Badge className={cn("capitalize", interestColors[call.interestLevel])}>
                  {call.interestLevel}
                </Badge>
              </TableCell>
              <TableCell className="text-foreground font-mono">{call.duration}</TableCell>
              <TableCell>
                <Badge className={cn("capitalize", statusColors[call.status])}>
                  {call.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {call.nextAction}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewCall(call.id)}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
