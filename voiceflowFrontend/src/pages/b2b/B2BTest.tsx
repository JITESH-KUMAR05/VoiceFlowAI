import { useState } from "react";
import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { AgentInfoCard } from "@/components/call/AgentInfoCard";
import { TestModeSelector, TestMode } from "@/components/test/TestModeSelector";
import { TestForm } from "@/components/test/TestForm";
import { LiveCallInterface } from "@/components/call/LiveCallInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function B2BTest() {
  const [testMode, setTestMode] = useState<TestMode>("phone");
  const [activeSession, setActiveSession] = useState<any>(null);

  return (
    <AgentLayout agentType="b2b">
      <div className="container mx-auto px-6 pb-12">
        
        {/* If Session Active -> Show Live Interface */}
        {activeSession ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              variant="ghost" 
              className="mb-4 pl-0 hover:pl-2 transition-all"
              onClick={() => setActiveSession(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> End Session
            </Button>
            
            <LiveCallInterface session={activeSession} />
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Test Agent</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Test B2B Sales Copilot</h1>
              <p className="text-muted-foreground">
                Test the B2B Sales AI agent via phone call or browser session.
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
                  agentName="Priya Sharma"
                  agentRole="AI Sales Agent"
                  purpose="Qualify B2B leads for startups and MSMEs"
                  voice="Premium Indian English"
                  languages={["English", "Hindi", "Telugu"]}
                  features={[
                    "Live conversation analysis",
                    "Objection handling scripts",
                    "Competitor battle cards",
                  ]}
                  variant="primary"
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
                  
                  <div className="mb-6">
                    <TestModeSelector
                      mode={testMode}
                      onChange={setTestMode}
                      agentType="b2b"
                    />
                  </div>

                  <TestForm 
                    agentType="b2b" 
                    testMode={testMode} 
                    onSubmit={(data) => {
                      if (testMode === "browser") {
                        setActiveSession(data);
                      }
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </AgentLayout>
  );
}