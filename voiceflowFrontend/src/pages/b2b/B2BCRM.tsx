import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Users, TrendingUp, Clock } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { agentConfigs } from "@/types/agent";

export default function B2BCRM() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(""); // [FIX] Added Search State
  const [leads, setLeads] = useState<any[]>([]);
  const config = agentConfigs.b2b;

  useEffect(() => {
    fetch("http://localhost:8000/api/crm/leads?agent_type=b2b")
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Failed to fetch leads", err));
  }, []);

  // [FIX] Filter & Search Logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = (lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeFilter === "All") return true;
    if (activeFilter === "Qualified") return lead.score > 70;
    if (activeFilter === "Contacted") return lead.status?.toLowerCase().includes("contacted") || lead.status?.toLowerCase().includes("completed");
    if (activeFilter === "New") return lead.status?.toLowerCase().includes("open") || lead.status?.toLowerCase().includes("new");
    if (activeFilter === "Converted") return lead.status?.toLowerCase().includes("converted");
    if (activeFilter === "Lost") return lead.score < 30;
    
    return true;
  });

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

            {/* [FIX] Real Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              <StatCard
                title="Total Leads"
                value={leads.length.toString()}
                change="+5%"
                changeType="positive"
                icon={Users}
                variant="secondary"
              />
              <StatCard
                title="Qualified"
                value={leads.filter(u => u.score > 70).length.toString()}
                change="+12%"
                changeType="positive"
                icon={TrendingUp}
                variant="primary"
              />
              <StatCard
                title="Avg Score"
                value={(leads.reduce((acc, curr) => acc + curr.score, 0) / (leads.length || 1)).toFixed(0)}
                change="+3%"
                changeType="positive"
                icon={Clock}
                variant="default"
              />
              <StatCard
                title="Pipeline Value"
                value="$0"
                change="0%"
                changeType="neutral"
                icon={TrendingUp}
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
                    value={searchQuery} // [FIX] Bind value
                    onChange={(e) => setSearchQuery(e.target.value)} // [FIX] Bind onChange
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["All", "Qualified", "Contacted", "New", "Converted", "Lost"].map((filter) => (
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

            {/* [FIX] Real List */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent B2B Leads</h3>
                <div className="space-y-3">
                    {/* [FIX] Use filteredLeads */}
                    {filteredLeads.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="font-medium text-foreground">{user.name}</p>
                                    <span className={cn("text-xs px-2 py-1 rounded-full", user.score > 70 ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600")}>
                                        Score: {user.score}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.company}</p>
                                {/* [FIX] Display Summary */}
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                    {user.summary || "No summary available"}
                                </p>
                            </div>
                        </div>
                    ))}
                    {filteredLeads.length === 0 && <p className="text-muted-foreground">No leads found.</p>}
                </div>
            </div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
