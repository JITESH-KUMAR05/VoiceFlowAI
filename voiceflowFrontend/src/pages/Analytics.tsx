import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Users, Clock, TrendingUp, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CallTable } from "@/components/dashboard/CallTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stats = [
  { title: "Total Calls", value: "2,847", change: "+18%", changeType: "positive" as const, icon: Phone, variant: "primary" as const },
  { title: "Interested Leads", value: "423", change: "+24%", changeType: "positive" as const, icon: TrendingUp, variant: "secondary" as const },
  { title: "Follow-ups Needed", value: "89", change: "-5%", changeType: "negative" as const, icon: Users, variant: "default" as const },
  { title: "Avg. Call Duration", value: "3:45", change: "+12%", changeType: "positive" as const, icon: Clock, variant: "default" as const },
];

const mockCalls = [
  {
    id: "1",
    leadName: "Rajesh Kumar",
    email: "rajesh@techstartup.io",
    callDate: "Dec 23, 2024",
    callTime: "10:30 AM",
    interestLevel: "high" as const,
    duration: "5:23",
    status: "completed" as const,
    nextAction: "Send proposal by Dec 25",
  },
  {
    id: "2",
    leadName: "Priya Sharma",
    email: "priya@enterprise.com",
    callDate: "Dec 23, 2024",
    callTime: "11:15 AM",
    interestLevel: "medium" as const,
    duration: "3:45",
    status: "follow-up" as const,
    nextAction: "Schedule demo call",
  },
  {
    id: "3",
    leadName: "Amit Patel",
    email: "amit@realestate.in",
    callDate: "Dec 22, 2024",
    callTime: "3:00 PM",
    interestLevel: "high" as const,
    duration: "6:12",
    status: "completed" as const,
    nextAction: "Send property listings",
  },
  {
    id: "4",
    leadName: "Sneha Reddy",
    email: "sneha@startup.co",
    callDate: "Dec 22, 2024",
    callTime: "2:30 PM",
    interestLevel: "low" as const,
    duration: "2:18",
    status: "completed" as const,
    nextAction: "Follow up in 2 weeks",
  },
  {
    id: "5",
    leadName: "Vikram Singh",
    email: "vikram@corp.com",
    callDate: "Dec 22, 2024",
    callTime: "11:00 AM",
    interestLevel: "none" as const,
    duration: "1:05",
    status: "missed" as const,
    nextAction: "Retry call tomorrow",
  },
  {
    id: "6",
    leadName: "Anita Desai",
    email: "anita@solutions.in",
    callDate: "Dec 21, 2024",
    callTime: "4:45 PM",
    interestLevel: "high" as const,
    duration: "4:56",
    status: "follow-up" as const,
    nextAction: "Send case studies",
  },
];

const filterOptions = ["All", "Interested", "Neutral", "Not Interested", "Follow-up"];

export default function Analytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  const handleViewCall = (id: string) => {
    setSelectedCall(id);
  };

  const selectedCallData = mockCalls.find((call) => call.id === selectedCall);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Call Analytics</h1>
          <p className="text-muted-foreground">Monitor and analyze all your AI-powered calls</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>

            {/* Filter Buttons */}
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

        {/* Call History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <CallTable calls={mockCalls} onViewCall={handleViewCall} />
        </motion.div>

        {/* Call Detail Modal */}
        <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Call Details</DialogTitle>
            </DialogHeader>
            {selectedCallData && (
              <div className="space-y-6">
                {/* Call Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Lead Name</p>
                    <p className="font-medium text-foreground">{selectedCallData.leadName}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium text-foreground">{selectedCallData.email}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Call Duration</p>
                    <p className="font-medium text-foreground">{selectedCallData.duration}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Interest Level</p>
                    <Badge
                      className={cn(
                        "capitalize",
                        selectedCallData.interestLevel === "high"
                          ? "bg-secondary/20 text-secondary"
                          : selectedCallData.interestLevel === "medium"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selectedCallData.interestLevel}
                    </Badge>
                  </div>
                </div>

                {/* Call Summary */}
                <div className="glass-card p-4">
                  <h4 className="font-medium text-foreground mb-2">Call Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    The lead expressed interest in our voice AI platform. They are currently evaluating 
                    multiple solutions and requested a detailed proposal with pricing. Key pain points 
                    identified: manual call handling, lead qualification bottleneck, and CRM integration needs.
                  </p>
                </div>

                {/* Objections Detected */}
                <div className="glass-card p-4">
                  <h4 className="font-medium text-foreground mb-2">Objections Detected</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      Price concern - requested competitive pricing
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      Integration timeline - needs implementation within 2 weeks
                    </li>
                  </ul>
                </div>

                {/* Next Follow-up */}
                <div className="glass-card p-4 border-primary/30">
                  <h4 className="font-medium text-foreground mb-2">Recommended Next Steps</h4>
                  <p className="text-sm text-primary">{selectedCallData.nextAction}</p>
                </div>

                {/* Call Recording Placeholder */}
                <div className="glass-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    🎧 Call recording available (Premium feature)
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
