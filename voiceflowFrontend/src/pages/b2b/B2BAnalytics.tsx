import { motion } from "framer-motion";
import { Phone, Users, TrendingUp, Clock, Target, BarChart3 } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { agentConfigs } from "@/types/agent";

export default function B2BAnalytics() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">B2B Sales Analytics</h1>
          <p className="text-muted-foreground">Performance metrics for the B2B Sales Copilot agent</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
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
            title="Follow-ups Pending"
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

        {/* Additional Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Conversion Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="text-2xl font-bold text-primary">{config.kpis.conversionRate}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[27%] bg-gradient-to-r from-primary to-cyan-400 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground">Hot Leads</p>
                  <p className="text-xl font-bold text-foreground">127</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/10">
                  <p className="text-xs text-muted-foreground">Closed Deals</p>
                  <p className="text-xl font-bold text-foreground">34</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Call Distribution
            </h3>
            <div className="space-y-3">
              {[
                { label: "Completed", value: 78, color: "bg-secondary" },
                { label: "Follow-up Needed", value: 15, color: "bg-primary" },
                { label: "Missed/No Answer", value: 7, color: "bg-destructive" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn(`h-full ${item.color} rounded-full`)} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Charts Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="glass-card p-8 text-center"
        >
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Analytics Coming Soon</h3>
          <p className="text-muted-foreground">
            Interactive charts and detailed reports will be available here.
          </p>
        </motion.div>
      </div>
    </AgentLayout>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
