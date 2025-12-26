import { useState } from "react";
import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { AgentInfoCard } from "@/components/call/AgentInfoCard";
import { TestModeSelector, TestMode } from "@/components/test/TestModeSelector";
import { TestForm } from "@/components/test/TestForm";

export default function RealEstateTest() {
  const [testMode, setTestMode] = useState<TestMode>("phone");

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">Test Agent</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Test Real Estate Agent</h1>
          <p className="text-muted-foreground">
            Test the Real Estate AI agent via phone call or browser session. Configure language, voice, and model settings.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Agent Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <AgentInfoCard
              agentName="Kavya Sharma"
              agentRole="AI Real Estate Agent"
              purpose="Qualify property buyers and investors through intelligent conversation"
              voice="Premium Indian English & Hindi"
              languages={["English", "Hindi", "Telugu", "Tamil", "Kannada"]}
              features={[
                "Automated lead qualification",
                "Property matching & recommendations",
                "Site visit scheduling",
                "Investment analysis",
              ]}
              variant="secondary"
            />
          </motion.div>

          {/* Test Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Test Mode</h2>
              
              {/* Mode Selector */}
              <div className="mb-6">
                <TestModeSelector
                  mode={testMode}
                  onChange={setTestMode}
                  agentType="real-estate"
                />
              </div>

              {/* Mode Description */}
              <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
                {testMode === "phone" ? (
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Phone Testing</h3>
                    <p className="text-sm text-muted-foreground">
                      The AI agent will call you on your phone. Perfect for testing the full voice experience with real audio quality.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Browser Testing</h3>
                    <p className="text-sm text-muted-foreground">
                      Talk to the AI agent directly in your browser using your microphone. Great for quick tests without phone calls.
                    </p>
                  </div>
                )}
              </div>

              {/* Form */}
              <TestForm agentType="real-estate" testMode={testMode} />
            </div>
          </motion.div>
        </div>
      </div>
    </AgentLayout>
  );
}
