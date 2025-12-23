import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { AgentInfoCard } from "@/components/call/AgentInfoCard";
import { CallInitiationForm } from "@/components/forms/CallInitiationForm";

export default function RealEstate() {
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">Real Estate Agent</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Property <span className="gradient-text-secondary">Consultation Call</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI real estate agent will understand your property requirements, 
            match suitable properties, and schedule site visits automatically.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-8">
          {/* Agent Info - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <AgentInfoCard
              agentName="Ananya Gupta (AI Agent)"
              purpose="Real estate consultation & property matching"
              voice="Premium Hindi-English Bilingual"
              languages={["Hindi", "English"]}
              variant="secondary"
            />

            {/* Additional Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 border-secondary/20"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">What to Expect</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-secondary">•</span>
                  Understand your property requirements
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary">•</span>
                  Match properties from 500+ listings
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary">•</span>
                  Investment analysis & EMI calculations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary">•</span>
                  Schedule site visits instantly
                </li>
              </ul>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-2"
            >
              {["RERA Verified", "500+ Properties", "24/7 Support"].map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-secondary/10 border border-secondary/20 text-secondary"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Call Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 glass-card p-8 border-secondary/20"
          >
            <h2 className="text-2xl font-semibold text-foreground mb-6">Enter Your Details</h2>
            <CallInitiationForm variant="real-estate" />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
