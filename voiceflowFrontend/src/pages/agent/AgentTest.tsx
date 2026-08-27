import { useState } from "react";

import { LiveCallInterface } from "@/components/call/LiveCallInterface";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { TestForm } from "@/components/test/TestForm";
import { TestMode, TestModeSelector } from "@/components/test/TestModeSelector";
import { Button } from "@/components/ui/button";
import type { StartCallResponse } from "@/lib/api";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentTestProps {
  agentType: AgentType;
}

type ActiveSession = StartCallResponse & {
  lead_name: string;
  language: string;
};

export default function AgentTest({ agentType }: AgentTestProps) {
  const config = agentConfigs[agentType];
  const [testMode, setTestMode] = useState<TestMode>("browser");
  const [session, setSession] = useState<ActiveSession | null>(null);

  if (session) {
    return (
      <AgentLayout agentType={agentType}>
        <div className="container mx-auto pb-16">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-3"
            onClick={() => setSession(null)}
          >
            &larr; End session
          </Button>
          <LiveCallInterface session={session} />
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold">Start a call</h1>
          <p className="mt-2 text-muted-foreground">
            Run {config.name} against a lead. Browser mode uses the same prompt,
            model and speech synthesis as a phone call, so it is a real test of
            the agent rather than a mock.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="panel p-5">
            <h2 className="label-caps mb-3">Mode</h2>
            <div className="mb-6">
              <TestModeSelector mode={testMode} onChange={setTestMode} />
            </div>

            <TestForm
              agentType={agentType}
              testMode={testMode}
              onSubmit={(data) => {
                if (testMode === "browser") setSession(data);
              }}
            />
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <h2 className="label-caps mb-3">What it will do</h2>
              <ol className="space-y-2">
                {config.conversationSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="panel p-5">
              <h2 className="label-caps mb-3">After the call</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The transcript is scored against fixed weights, written to a
                Salesforce Lead with a call Task, and used to draft a follow-up
                email. Any provider without credentials is skipped and logged.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Browser mode needs microphone access and speech recognition, which
              currently means a Chromium-based browser.
            </p>
          </aside>
        </div>
      </div>
    </AgentLayout>
  );
}
