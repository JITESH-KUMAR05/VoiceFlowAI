import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { AgentLiveCall } from "@/components/call/AgentLiveCall";

export default function RealEstateLiveCall() {
  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">Real Estate Session</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Active Property Call</h1>
          <p className="text-muted-foreground">This agent qualifies property buyers and investors. Real-time property requirement extraction and site visit scheduling.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AgentLiveCall agentType="real-estate" />
        </motion.div>
      </div>
    </AgentLayout>
  );
}
