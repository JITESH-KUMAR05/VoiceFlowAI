import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Users, BarChart3, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { agentConfigs } from "@/types/agent";

export default function RealEstateDashboard() {
  const config = agentConfigs["real-estate"];

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{config.name}</h1>
          <p className="text-muted-foreground text-lg">{config.description}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-4 mb-8">
          <Link to="/real-estate/test"><Button variant="gradient-secondary" size="lg" className="gap-2"><Phone className="h-5 w-5" />Test Agent</Button></Link>
          <Link to="/real-estate/crm"><Button variant="glass" size="lg" className="gap-2"><Users className="h-5 w-5" />View CRM</Button></Link>
          <Link to="/real-estate/analytics"><Button variant="glass" size="lg" className="gap-2"><BarChart3 className="h-5 w-5" />View Analytics</Button></Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Calls" value={config.kpis.totalCalls.toLocaleString()} change="+15%" changeType="positive" icon={Phone} variant="secondary" />
          <StatCard title="Interested Leads" value={config.kpis.interestedLeads.toString()} change="+20%" changeType="positive" icon={TrendingUp} variant="primary" />
          <StatCard title="Follow-ups Needed" value={config.kpis.followUpsNeeded.toString()} change="-8%" changeType="negative" icon={Users} variant="default" />
          <StatCard title="Avg. Call Duration" value={config.kpis.avgCallDuration} change="+10%" changeType="positive" icon={Clock} variant="default" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Agent Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.features.map((feature, index) => (
              <motion.div key={feature} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/5 border border-secondary/10">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span className="text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/real-estate/test"><Button variant="gradient-secondary" className="gap-2">Test Real Estate Agent<ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </motion.div>
      </div>
    </AgentLayout>
  );
}
