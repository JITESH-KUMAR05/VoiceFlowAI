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
import { b2bUsers, b2bCalls } from "@/data/mockData";

const filterOptions = ["All", "Qualified", "Contacted", "New", "Converted", "Lost"];

export default function B2BCRM() {
  const [activeFilter, setActiveFilter] = useState("All");
  const config = agentConfigs.b2b;

  const totalUsers = b2bUsers.length;
  const qualifiedUsers = b2bUsers.filter(u => u.status === "qualified").length;
  const recentCalls = b2bCalls.length;

  return (
    <AgentLayout agentType="b2b">
      <div className="container mx-auto px-6 pb-12">
        <div className="flex gap-8">
          <CRMSidebar agentType="b2b" />

          <div className="flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-foreground mb-2">B2B Sales CRM</h1>
              <p className="text-muted-foreground">Manage your B2B leads, calls, and pipeline</p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              <StatCard
                title="Total Leads"
                value={totalUsers.toString()}
                change="+12%"
                changeType="positive"
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="Qualified"
                value={qualifiedUsers.toString()}
                change="+8%"
                changeType="positive"
                icon={TrendingUp}
                variant="secondary"
              />
              <StatCard
                title="Total Calls"
                value={recentCalls.toString()}
                change="+15%"
                changeType="positive"
                icon={Phone}
                variant="default"
              />
              <StatCard
                title="Conversion Rate"
                value={config.kpis.conversionRate}
                change="+3%"
                changeType="positive"
                icon={Clock}
                variant="default"
              />
            </motion.div>

            {/* Quick Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-4 mb-6"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    className="pl-10 bg-muted/50 border-border"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {filterOptions.map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        activeFilter === filter && "bg-primary text-primary-foreground"
                      )}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Overview Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Leads</h3>
                <div className="space-y-3">
                  {b2bUsers.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.company}</p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        user.interestLevel === "high" ? "bg-secondary/20 text-secondary" :
                        user.interestLevel === "medium" ? "bg-primary/20 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {user.interestLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Calls</h3>
                <div className="space-y-3">
                  {b2bCalls.slice(0, 3).map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">{call.leadName}</p>
                        <p className="text-sm text-muted-foreground">{call.callDate}</p>
                      </div>
                      <span className="text-sm font-mono text-foreground">{call.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
