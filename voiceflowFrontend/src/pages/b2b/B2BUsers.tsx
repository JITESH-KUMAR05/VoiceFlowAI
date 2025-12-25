import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { UserCard } from "@/components/crm/UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { b2bUsers } from "@/data/mockData";

const filterOptions = ["All", "High Interest", "Medium", "Low", "None"];

export default function B2BUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredUsers = b2bUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "All") return matchesSearch;
    if (activeFilter === "High Interest") return matchesSearch && user.interestLevel === "high";
    if (activeFilter === "Medium") return matchesSearch && user.interestLevel === "medium";
    if (activeFilter === "Low") return matchesSearch && user.interestLevel === "low";
    if (activeFilter === "None") return matchesSearch && user.interestLevel === "none";
    return matchesSearch;
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
              <h1 className="text-4xl font-bold text-foreground mb-2">B2B Leads</h1>
              <p className="text-muted-foreground">View and manage all your B2B sales leads</p>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card p-4 mb-6"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Users Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredUsers.map((user, index) => (
                <UserCard key={user.id} user={user} agentType="b2b" index={index} />
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="glass-card p-12 text-center">
                <p className="text-muted-foreground">No users found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
