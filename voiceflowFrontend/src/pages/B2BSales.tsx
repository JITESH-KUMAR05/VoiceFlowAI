import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { AgentInfoCard } from "@/components/call/AgentInfoCard";
import { CallInitiationForm } from "@/components/forms/CallInitiationForm";

export default function B2BSales() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">B2B Sales Copilot</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Initiate <span className="gradient-text">Sales Call</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI agent will call and qualify your B2B leads with intelligent conversation flows, 
            objection handling, and real-time CRM updates.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-8">
          {/* Agent Info - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <AgentInfoCard
              agentName="Priya Sharma (AI Agent)"
              purpose="Discuss voice AI / sales automation"
              voice="Premium Indian English"
              languages={["English", "Hindi", "Telugu (auto-switch)"]}
              variant="primary"
            />

            {/* Additional Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">What to Expect</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Call will begin within 30 seconds
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  AI will introduce your product/service
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Real-time objection handling
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Call summary sent to your email
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Call Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 glass-card p-8"
          >
            <h2 className="text-2xl font-semibold text-foreground mb-6">Enter Call Details</h2>
            <CallInitiationForm variant="b2b" />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
