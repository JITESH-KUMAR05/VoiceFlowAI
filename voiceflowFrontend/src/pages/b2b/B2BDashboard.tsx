import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Users, BarChart3, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { agentConfigs } from "@/types/agent";

export default function B2BDashboard() {
  const config = agentConfigs.b2b;

  return (
    <AgentLayout agentType="b2b">
      <div className="container mx-auto px-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">{config.name}</h1>
          <p className="text-muted-foreground text-lg">{config.description}</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <Link to="/b2b/live-call">
            <Button variant="gradient" size="lg" className="gap-2">
              <Phone className="h-5 w-5" />
              Start Live Call
            </Button>
          </Link>
          <Link to="/b2b/crm">
            <Button variant="glass" size="lg" className="gap-2">
              <Users className="h-5 w-5" />
              View CRM
            </Button>
          </Link>
          <Link to="/b2b/analytics">
            <Button variant="glass" size="lg" className="gap-2">
              <BarChart3 className="h-5 w-5" />
              View Analytics
            </Button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            title="Total Calls"
            value={config.kpis.totalCalls.toLocaleString()}
            change="+18%"
            changeType="positive"
            icon={Phone}
            variant="primary"
          />
          <StatCard
            title="Interested Leads"
            value={config.kpis.interestedLeads.toString()}
            change="+24%"
            changeType="positive"
            icon={TrendingUp}
            variant="secondary"
          />
          <StatCard
            title="Follow-ups Needed"
            value={config.kpis.followUpsNeeded.toString()}
            change="-5%"
            changeType="negative"
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Avg. Call Duration"
            value={config.kpis.avgCallDuration}
            change="+12%"
            changeType="positive"
            icon={Clock}
            variant="default"
          />
        </motion.div>

        {/* Agent Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Agent Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <Link to="/b2b/live-call">
              <Button variant="gradient" className="gap-2">
                Test B2B Sales Agent
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </AgentLayout>
  );
}
