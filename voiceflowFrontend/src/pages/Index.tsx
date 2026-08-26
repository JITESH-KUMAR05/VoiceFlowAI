import { Link } from "react-router-dom";

import { CallPathDiagram } from "@/components/CallPathDiagram";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { agentConfigs, type AgentType } from "@/types/agent";

const STACK = [
  { name: "Twilio", role: "Outbound PSTN and speech recognition" },
  { name: "Azure OpenAI", role: "Conversation and post-call scoring" },
  { name: "Murf", role: "Streamed speech synthesis" },
  { name: "Salesforce", role: "Lead records and call activity" },
  { name: "FastAPI", role: "Session state and webhook handling" },
];

/**
 * Decisions worth explaining. Each one is a real tradeoff in the code, with
 * the cost stated rather than only the benefit.
 */
const DECISIONS = [
  {
    title: "Speech is streamed, not rendered",
    body: "Murf audio is forwarded chunk by chunk as it arrives instead of being written to a file and then served. Waiting for a complete WAV adds the whole synthesis time to every turn, and on a phone call that time is audible silence. The cost is that a mid-stream failure truncates a sentence rather than failing cleanly.",
  },
  {
    title: "Sessions live in process memory",
    body: "Conversation history is held in a TTL-bounded in-process cache rather than a database. It is the right size for a demo and keeps a turn fast, but it means a restart drops in-flight calls and the service cannot run more than one worker, because a webhook may land on a worker that does not hold the session. Redis is the fix.",
  },
  {
    title: "The model scores against fixed weights",
    body: "Rather than asking for a number and trusting it, the analysis prompt specifies what each criterion is worth — a booked demo is 30 points, confirmed budget 20 — and the result is validated against a schema before it reaches Salesforce. An unprompted score drifts between calls and cannot be argued with.",
  },
  {
    title: "Webhooks are signature-verified",
    body: "Twilio's callbacks have to be publicly reachable, so they are authenticated by the request signature Twilio computes with the account auth token. Without it, anyone who found the tunnel URL could drive the call flow and spend model and synthesis credit.",
  },
];

export default function Index() {
  return (
    <Layout>
      <div className="container mx-auto pb-20">
        <section className="max-w-2xl py-16">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Outbound sales calls, handled end to end by an LLM agent.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            VoiceFlow places a real phone call, holds a consultative
            conversation, scores the lead against fixed criteria, and writes the
            result to Salesforce with a drafted follow-up email.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {(Object.keys(agentConfigs) as AgentType[]).map((type, index) => (
              <Button
                key={type}
                asChild
                variant={index === 0 ? "default" : "outline"}
              >
                <Link to={agentConfigs[type].basePath}>
                  Open {agentConfigs[type].name} console
                </Link>
              </Button>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Both consoles can run a call in the browser, which exercises the
            same prompt, model and synthesis path as a phone call without
            needing a provisioned number.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="label-caps mb-3">How a call runs</h2>
          <CallPathDiagram />
        </section>

        <section className="mb-16">
          <h2 className="label-caps mb-4">Design decisions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {DECISIONS.map((decision) => (
              <article key={decision.title} className="panel p-5">
                <h3 className="text-base font-semibold">{decision.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {decision.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="label-caps mb-4">The two agents</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(agentConfigs) as AgentType[]).map((type) => {
              const config = agentConfigs[type];
              return (
                <article key={type} className="panel p-5">
                  <h3 className="text-lg font-semibold">{config.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {config.description}
                  </p>
                  <ol className="mt-4 space-y-2 border-t border-border pt-4">
                    {config.conversationSteps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="outline" size="sm" className="mt-5">
                    <Link to={config.basePath}>Open console</Link>
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="label-caps mb-4">Built with</h2>
          <dl className="panel divide-y divide-border">
            {STACK.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="w-40 shrink-0 font-mono text-sm">{item.name}</dt>
                <dd className="text-sm text-muted-foreground">{item.role}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Layout>
  );
}
