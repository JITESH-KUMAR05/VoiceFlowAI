import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { AgentLiveCall } from "@/components/call/AgentLiveCall";

export default function B2BLiveCall() {
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
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">B2B Sales Session</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Active Sales Call</h1>
          <p className="text-muted-foreground">
            This agent qualifies B2B leads for startups and MSMEs. Real-time conversation tracking with sales-focused AI insights.
          </p>
        </motion.div>

        {/* Live Call Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <AgentLiveCall agentType="b2b" />
        </motion.div>
      </div>
    </AgentLayout>
  );
}
