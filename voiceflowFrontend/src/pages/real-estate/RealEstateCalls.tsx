import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { CallsTable } from "@/components/crm/CallsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { realEstateCalls } from "@/data/mockData";

export default function RealEstateCalls() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const filteredCalls = realEstateCalls.filter((call) => {
    const matchesSearch = call.leadName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "All") return matchesSearch;
    return matchesSearch && call.status === activeFilter.toLowerCase();
  });
  const selectedCallData = realEstateCalls.find((call) => call.id === selectedCall);

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <div className="flex gap-8">
          <CRMSidebar agentType="real-estate" />
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">Property Call Records</h1>
              <p className="text-muted-foreground">View all real estate call history</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-border" /></div>
                <div className="flex gap-2">{["All", "Completed", "Follow-up"].map((f) => (<Button key={f} variant={activeFilter === f ? "default" : "ghost"} size="sm" onClick={() => setActiveFilter(f)} className={cn(activeFilter === f && "bg-secondary text-secondary-foreground")}>{f}</Button>))}</div>
              </div>
            </motion.div>
            <CallsTable calls={filteredCalls} onViewCall={setSelectedCall} />
          </div>
        </div>
      </div>
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">Call Details</DialogTitle></DialogHeader>
          {selectedCallData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4"><p className="text-sm text-muted-foreground mb-1">Lead</p><p className="font-medium text-foreground">{selectedCallData.leadName}</p></div>
                <div className="glass-card p-4"><p className="text-sm text-muted-foreground mb-1">Duration</p><p className="font-medium text-foreground font-mono">{selectedCallData.duration}</p></div>
              </div>
              {selectedCallData.summary && <div className="glass-card p-4"><h4 className="font-medium text-foreground mb-2">Summary</h4><p className="text-sm text-muted-foreground">{selectedCallData.summary}</p></div>}
              <div className="glass-card p-4 border-secondary/30"><h4 className="font-medium text-foreground mb-2">Next Action</h4><p className="text-sm text-secondary">{selectedCallData.nextAction}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AgentLayout>
  );
}
