import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, DollarSign, Home } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { realEstateUsers, realEstateCalls } from "@/data/mockData";

const interestColors = { high: "bg-secondary/20 text-secondary", medium: "bg-primary/20 text-primary", low: "bg-yellow-500/20 text-yellow-500", none: "bg-muted text-muted-foreground" };
const statusColors = { new: "bg-blue-500/20 text-blue-400", contacted: "bg-primary/20 text-primary", qualified: "bg-secondary/20 text-secondary", converted: "bg-emerald-500/20 text-emerald-400", lost: "bg-destructive/20 text-destructive" };

export default function RealEstateUserDetail() {
  const { id } = useParams<{ id: string }>();
  const user = realEstateUsers.find((u) => u.id === id);
  const userCalls = realEstateCalls.filter((c) => c.userId === id);

  if (!user) return <AgentLayout agentType="real-estate"><div className="container mx-auto px-6 py-12"><div className="panel p-12 text-center"><p className="text-muted-foreground">User not found.</p><Link to="/real-estate/crm/users"><Button variant="ghost" className="mt-4">Back</Button></Link></div></div></AgentLayout>;

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6"><Link to="/real-estate/crm/users"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Users</Button></Link></motion.div>
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
            <div className="panel p-6 sticky top-28">
              <div className="mb-6"><h1 className="text-2xl font-bold text-foreground mb-2">{user.name}</h1><div className="flex flex-wrap gap-2"><Badge className={cn("capitalize", interestColors[user.interestLevel])}>{user.interestLevel} interest</Badge><Badge className={cn("capitalize", statusColors[user.status])}>{user.status}</Badge></div></div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4" /><span className="text-sm">{user.email}</span></div>
                <div className="flex items-center gap-3 text-muted-foreground"><Phone className="h-4 w-4" /><span className="text-sm">{user.phone}</span></div>
                {user.location && <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4" /><span className="text-sm">{user.location}</span></div>}
                {user.budget && <div className="flex items-center gap-3 text-muted-foreground"><DollarSign className="h-4 w-4" /><span className="text-sm">{user.budget}</span></div>}
                {user.propertyType && <div className="flex items-center gap-3 text-muted-foreground"><Home className="h-4 w-4" /><span className="text-sm">{user.propertyType} ({user.buyOrRent})</span></div>}
              </div>
              {user.notes && <div className="mt-6 pt-6 border-t border-border"><h3 className="text-sm font-medium text-foreground mb-2">Notes</h3><p className="text-sm text-muted-foreground">{user.notes}</p></div>}
              <div className="mt-6"><Link to="/real-estate/live-call"><Button variant="default" className="w-full">Start New Call</Button></Link></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Call History</h2>
              {userCalls.length === 0 ? <p className="text-muted-foreground text-center py-8">No calls recorded.</p> : (
                <div className="space-y-4">{userCalls.map((call, i) => (<motion.div key={call.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-lg bg-muted/30 border border-border"><div className="flex items-start justify-between mb-3"><div><p className="font-medium text-foreground">{call.callDate} at {call.callTime}</p><p className="text-sm text-muted-foreground">Duration: {call.duration}</p></div><Badge className={cn("capitalize", call.status === "completed" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary")}>{call.status}</Badge></div>{call.summary && <p className="text-sm text-muted-foreground mb-3">{call.summary}</p>}<div className="flex items-center justify-between pt-3 border-t border-border"><span className="text-xs text-muted-foreground">Next: {call.nextAction}</span></div></motion.div>))}</div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AgentLayout>
  );
}
