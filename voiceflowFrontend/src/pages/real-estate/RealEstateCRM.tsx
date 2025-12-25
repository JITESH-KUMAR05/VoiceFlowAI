import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Users, TrendingUp, Clock } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { agentConfigs } from "@/types/agent";
import { realEstateUsers, realEstateCalls } from "@/data/mockData";

export default function RealEstateCRM() {
  const [activeFilter, setActiveFilter] = useState("All");
  const config = agentConfigs["real-estate"];

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <div className="flex gap-8">
          <CRMSidebar agentType="real-estate" />
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">Real Estate CRM</h1>
              <p className="text-muted-foreground">Manage property leads, calls, and pipeline</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Leads" value={realEstateUsers.length.toString()} change="+10%" changeType="positive" icon={Users} variant="secondary" />
              <StatCard title="Qualified" value={realEstateUsers.filter(u => u.status === "qualified").length.toString()} change="+12%" changeType="positive" icon={TrendingUp} variant="primary" />
              <StatCard title="Total Calls" value={realEstateCalls.length.toString()} change="+8%" changeType="positive" icon={Phone} variant="default" />
              <StatCard title="Conversion Rate" value={config.kpis.conversionRate} change="+2%" changeType="positive" icon={Clock} variant="default" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search leads..." className="pl-10 bg-muted/50 border-border" /></div>
                <div className="flex gap-2">{["All", "Qualified", "New", "Contacted"].map((f) => (<Button key={f} variant={activeFilter === f ? "default" : "ghost"} size="sm" onClick={() => setActiveFilter(f)} className={cn(activeFilter === f && "bg-secondary text-secondary-foreground")}>{f}</Button>))}</div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Leads</h3>
                <div className="space-y-3">{realEstateUsers.slice(0, 3).map((user) => (<div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30"><div><p className="font-medium text-foreground">{user.name}</p><p className="text-sm text-muted-foreground">{user.location}</p></div><span className={cn("text-xs px-2 py-1 rounded-full", user.interestLevel === "high" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground")}>{user.interestLevel}</span></div>))}</div>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Calls</h3>
                <div className="space-y-3">{realEstateCalls.slice(0, 3).map((call) => (<div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30"><div><p className="font-medium text-foreground">{call.leadName}</p><p className="text-sm text-muted-foreground">{call.callDate}</p></div><span className="text-sm font-mono text-foreground">{call.duration}</span></div>))}</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
