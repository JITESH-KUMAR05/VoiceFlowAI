import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { LiveCallInterface } from "@/components/call/LiveCallInterface";

export default function LiveCall() {
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
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">Live Session</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Active Call Monitor</h1>
          <p className="text-muted-foreground">
            Real-time conversation tracking with AI-powered insights and suggested responses
          </p>
        </motion.div>

        {/* Live Call Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <LiveCallInterface />
        </motion.div>
      </div>
    </Layout>
  );
}
