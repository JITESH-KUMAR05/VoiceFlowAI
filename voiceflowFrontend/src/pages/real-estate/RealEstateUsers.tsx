import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { UserCard } from "@/components/crm/UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { realEstateUsers } from "@/data/mockData";

export default function RealEstateUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filteredUsers = realEstateUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.location?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "All") return matchesSearch;
    if (activeFilter === "High Interest") return matchesSearch && user.interestLevel === "high";
    return matchesSearch;
  });

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <div className="flex gap-8">
          <CRMSidebar agentType="real-estate" />
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">Property Leads</h1>
              <p className="text-muted-foreground">View and manage all real estate leads</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-border" /></div>
                <div className="flex gap-2">{["All", "High Interest", "Medium", "Low"].map((f) => (<Button key={f} variant={activeFilter === f ? "default" : "ghost"} size="sm" onClick={() => setActiveFilter(f)} className={cn(activeFilter === f && "bg-secondary text-secondary-foreground")}>{f}</Button>))}</div>
              </div>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">{filteredUsers.map((user, index) => (<UserCard key={user.id} user={user} agentType="real-estate" index={index} />))}</div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
