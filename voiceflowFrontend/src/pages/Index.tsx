import { motion } from "framer-motion";
import { Zap, Building2, Phone, Languages, GitBranch } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AgentCard } from "@/components/dashboard/AgentCard";

const b2bFeatures = [
  "Consultative discovery prompt",
  "Weighted 0-100 lead scoring",
  "Pain points extracted to CRM",
  "Salesforce Lead sync",
  "AI-drafted follow-up email",
];

const realEstateFeatures = [
  "Budget and location qualification",
  "Investment vs. self-use routing",
  "Site visit proposal",
  "Hindi and English voices",
  "Salesforce Lead sync",
];

const capabilities = [
  {
    icon: Phone,
    title: "Real outbound calls",
    description:
      "Twilio places the call and streams speech recognition back as the caller talks. The same pipeline runs in-browser for testing without spending call credit.",
  },
  {
    icon: Languages,
    title: "Streamed speech synthesis",
    description:
      "Murf audio is streamed chunk by chunk rather than generated to a file first, so the agent starts speaking before the full response has rendered.",
  },
  {
    icon: GitBranch,
    title: "Post-call pipeline",
    description:
      "When a call ends, the transcript is scored against weighted criteria, written to Salesforce custom fields, and used to draft a follow-up email.",
  },
];

export default function Index() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
            <span className="gradient-text">VoiceFlow</span> AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            An outbound voice agent that places a real phone call, holds a consultative
            sales conversation, scores the lead, and writes the result to Salesforce.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {["Twilio", "Azure OpenAI", "Murf AI", "Salesforce", "FastAPI"].map((tech) => (
              <div
                key={tech}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border"
              >
                <span className="text-sm text-muted-foreground">{tech}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Agent Cards Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">Agent personas</h2>
            <p className="text-muted-foreground">
              Both run the same pipeline. They differ in system prompt, greeting, and voice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <AgentCard
              title="B2B Sales"
              description="Qualifies inbound SaaS leads over the phone"
              features={b2bFeatures}
              tags={["Azure OpenAI", "English"]}
              ctaText="Open B2B console"
              ctaLink="/b2b"
              icon={Zap}
              variant="primary"
            />
            <AgentCard
              title="Real Estate"
              description="Qualifies property enquiries and proposes a site visit"
              features={realEstateFeatures}
              tags={["Murf AI Voices", "Hindi + English"]}
              ctaText="Open Real Estate console"
              ctaLink="/real-estate"
              icon={Building2}
              variant="secondary"
            />
          </div>
        </motion.div>

        {/* Capabilities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {capabilities.map((capability) => (
              <div key={capability.title} className="glass-card p-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <capability.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {capability.title}
                </h3>
                <p className="text-sm text-muted-foreground">{capability.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
