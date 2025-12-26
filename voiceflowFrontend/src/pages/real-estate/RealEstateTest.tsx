import { useState } from "react";
import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { AgentInfoCard } from "@/components/call/AgentInfoCard";
import { TestModeSelector, TestMode } from "@/components/test/TestModeSelector";
import { TestForm } from "@/components/test/TestForm";
import { LiveCallInterface } from "@/components/call/LiveCallInterface"; // Import this
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RealEstateTest() {
  const [testMode, setTestMode] = useState<TestMode>("phone");
  const [activeSession, setActiveSession] = useState<any>(null); // Add State

  return (
    <AgentLayout agentType="real-estate">
      <div className="container mx-auto px-6 pb-12">
        
        {/* [FIX] Toggle between Form and Live Interface */}
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
              <h1 className="text-4xl font-bold text-foreground mb-2">Test Real Estate Copilot</h1>
              <p className="text-muted-foreground">
                Test the Real Estate AI agent via phone call or browser session.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <AgentInfoCard
                  agentName="Sarah"
                  agentRole="Real Estate Specialist"
                  purpose="Qualify leads and schedule property visits"
                  voice="Professional Female"
                  languages={["English", "Hindi", "Marathi"]}
                  features={[
                    "Budget qualification",
                    "Location preference analysis",
                    "Visit scheduling",
                  ]}
                  variant="primary"
                />
              </motion.div>

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
                      agentType="real-estate"
                    />
                  </div>

                  <TestForm 
                    agentType="real-estate" 
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