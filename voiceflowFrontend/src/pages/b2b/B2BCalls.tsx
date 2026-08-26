import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { CallsTable } from "@/components/crm/CallsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const filterOptions = ["All", "Completed", "Follow-up", "Missed"];

export default function B2BCalls() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [calls, setCalls] = useState<any[]>([]);

  // Fetch Real Data
  useEffect(() => {
    api.leads("b2b")
      .then(data => {
        const mappedCalls = data.map((lead: any) => ({
            id: lead.id,
            leadName: lead.name,
            email: lead.email,
            date: new Date(lead.last_contact).toLocaleString(),
            duration: "2m 30s", 
            status: "completed",
            interest: lead.score > 70 ? "high" : lead.score > 40 ? "medium" : "low",
            summary: lead.summary,
            nextAction: "Follow up email sent",
        }));
        setCalls(mappedCalls);
      })
      .catch(err => console.error("Failed to fetch calls", err));
  }, []);

  const filteredCalls = calls.filter((call) => {
    const matchesSearch = (call.leadName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (call.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "All") return matchesSearch;
    return matchesSearch && call.status === activeFilter.toLowerCase();
  });

  const selectedCallData = calls.find((call) => call.id === selectedCall);

  return (
    <AgentLayout agentType="b2b">
      <div className="container mx-auto px-6 pb-12">
        <div className="flex gap-8">
          <CRMSidebar agentType="b2b" />
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">B2B Call Records</h1>
              <p className="text-muted-foreground">View all B2B sales call history and details</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="panel p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-border" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {filterOptions.map((filter) => (
                    <Button key={filter} variant={activeFilter === filter ? "default" : "ghost"} size="sm" onClick={() => setActiveFilter(filter)} className={cn(activeFilter === filter && "bg-primary text-primary-foreground")}>
                      {filter}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <CallsTable calls={filteredCalls} onViewCall={setSelectedCall} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call Detail Modal */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Call Details</DialogTitle>
          </DialogHeader>
          {selectedCallData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="panel p-4">
                  <p className="text-sm text-muted-foreground mb-1">Lead Name</p>
                  <p className="font-medium text-foreground">{selectedCallData.leadName}</p>
                </div>
                <div className="panel p-4">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-foreground">{selectedCallData.email}</p>
                </div>
                <div className="panel p-4">
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-medium text-foreground">{selectedCallData.date}</p>
                </div>
                <div className="panel p-4">
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium text-foreground font-mono">{selectedCallData.duration}</p>
                </div>
                <div className="panel p-4">
                  <p className="text-sm text-muted-foreground mb-1">Interest Level</p>
                  <Badge variant="outline" className="capitalize">{selectedCallData.interest}</Badge>
                </div>
              </div>
              
              {selectedCallData.summary && (
                <div className="panel p-4">
                  <h4 className="font-medium text-foreground mb-2">Call Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCallData.summary}</p>
                </div>
              )}

              <div className="panel p-4 border-primary/30">
                <h4 className="font-medium text-foreground mb-2">Next Action</h4>
                <p className="text-sm text-primary">{selectedCallData.nextAction}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AgentLayout>
  );
}