import { motion } from "framer-motion";
import { Phone, Users, TrendingUp, Clock, Target, BarChart3 } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { agentConfigs } from "@/types/agent";
import { cn } from "@/lib/utils";

export default function RealEstateAnalytics() {
  const config = agentConfigs["real-estate"];

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Real Estate Analytics</h1>
          <p className="text-muted-foreground">Performance metrics for the Real Estate agent</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Calls" value={config.kpis.totalCalls.toLocaleString()} change="+15%" changeType="positive" icon={Phone} variant="secondary" />
          <StatCard title="Interested Leads" value={config.kpis.interestedLeads.toString()} change="+20%" changeType="positive" icon={TrendingUp} variant="primary" />
          <StatCard title="Follow-ups Pending" value={config.kpis.followUpsNeeded.toString()} change="-8%" changeType="negative" icon={Users} variant="default" />
          <StatCard title="Avg. Call Duration" value={config.kpis.avgCallDuration} change="+10%" changeType="positive" icon={Clock} variant="default" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-secondary" />Conversion Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Conversion Rate</span><span className="text-2xl font-bold text-secondary">{config.kpis.conversionRate}</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full w-[26%] bg-gradient-to-r from-secondary to-emerald-400 rounded-full" /></div>
              <div className="grid grid-cols-2 gap-4 pt-4"><div className="p-3 rounded-lg bg-secondary/10"><p className="text-xs text-muted-foreground">Site Visits Booked</p><p className="text-xl font-bold text-foreground">89</p></div><div className="p-3 rounded-lg bg-primary/10"><p className="text-xs text-muted-foreground">Deals Closed</p><p className="text-xl font-bold text-foreground">23</p></div></div>
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-secondary" />Call Distribution</h3>
            <div className="space-y-3">
              {[{ label: "Completed", value: 72, color: "bg-secondary" }, { label: "Follow-up Needed", value: 20, color: "bg-primary" }, { label: "Missed", value: 8, color: "bg-destructive" }].map((item) => (<div key={item.label}><div className="flex items-center justify-between text-sm mb-1"><span className="text-muted-foreground">{item.label}</span><span className="text-foreground font-medium">{item.value}%</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className={cn(`h-full ${item.color} rounded-full`)} style={{ width: `${item.value}%` }} /></div></div>))}
            </div>
          </div>
        </motion.div>
      </div>
    </AgentLayout>
  );
}
