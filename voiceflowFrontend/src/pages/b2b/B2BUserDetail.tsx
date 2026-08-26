import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Clock } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { b2bUsers, b2bCalls } from "@/data/mockData";

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

export default function B2BUserDetail() {
  const { id } = useParams<{ id: string }>();
  const user = b2bUsers.find((u) => u.id === id);
  const userCalls = b2bCalls.filter((c) => c.userId === id);

  if (!user) {
    return (
      <AgentLayout agentType="b2b">
        <div className="container mx-auto px-6 py-12">
          <div className="panel p-12 text-center">
            <p className="text-muted-foreground">User not found.</p>
            <Link to="/b2b/crm/users">
              <Button variant="ghost" className="mt-4">Back to Users</Button>
            </Link>
          </div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout agentType="b2b">
      <div className="container mx-auto px-6 pb-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link to="/b2b/crm/users">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="panel p-6 sticky top-28">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{user.name}</h1>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("capitalize", interestColors[user.interestLevel])}>
                    {user.interestLevel} interest
                  </Badge>
                  <Badge className={cn("capitalize", statusColors[user.status])}>
                    {user.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{user.phone}</span>
                </div>
                {user.company && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">{user.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Added: {user.createdAt}</span>
                </div>
                {user.lastContactedAt && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last Contact: {user.lastContactedAt}</span>
                  </div>
                )}
              </div>

              {user.notes && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{user.notes}</p>
                </div>
              )}

              <div className="mt-6">
                <Link to="/b2b/live-call">
                  <Button variant="default" className="w-full">
                    Start New Call
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Call History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Call History</h2>
              
              {userCalls.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No calls recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {userCalls.map((call, index) => (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{call.callDate} at {call.callTime}</p>
                          <p className="text-sm text-muted-foreground">Duration: {call.duration}</p>
                        </div>
                        <Badge className={cn(
                          "capitalize",
                          call.status === "completed" ? "bg-secondary/20 text-secondary" :
                          call.status === "follow-up" ? "bg-primary/20 text-primary" :
                          "bg-destructive/20 text-destructive"
                        )}>
                          {call.status}
                        </Badge>
                      </div>
                      
                      {call.summary && (
                        <p className="text-sm text-muted-foreground mb-3">{call.summary}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">Next: {call.nextAction}</span>
                        <Badge className={cn("capitalize", interestColors[call.interestLevel])}>
                          {call.interestLevel} interest
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AgentLayout>
  );
}
