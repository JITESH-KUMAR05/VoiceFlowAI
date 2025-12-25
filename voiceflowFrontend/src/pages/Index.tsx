import { motion } from "framer-motion";
import { Zap, Building2, Phone, BarChart3, Shield, Globe } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AgentCard } from "@/components/dashboard/AgentCard";
import { StatCard } from "@/components/dashboard/StatCard";

const b2bFeatures = [
  "Live conversation analysis",
  "Objection handling scripts",
  "Competitor battle cards",
  "CRM auto-sync (UI only)",
  "Deal progression tracking",
];

const realEstateFeatures = [
  "Automated lead qualification",
  "Property matching & recommendations",
  "Site visit scheduling",
  "Multi-language support (Hindi + English)",
  "Investment analysis",
];

const stats = [
  { title: "Total Calls Today", value: "1,247", change: "+12%", changeType: "positive" as const, icon: Phone, variant: "primary" as const },
  { title: "Qualified Leads", value: "342", change: "+8%", changeType: "positive" as const, icon: BarChart3, variant: "secondary" as const },
  { title: "Avg. Call Duration", value: "4:32", change: "-5%", changeType: "neutral" as const, icon: Shield, variant: "default" as const },
  { title: "Active Agents", value: "12", change: "", changeType: "neutral" as const, icon: Globe, variant: "default" as const },
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
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">AI-Powered Voice Intelligence</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
            <span className="gradient-text">VoiceFlow</span> AI Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Multi-industry voice intelligence powered by AI. Automate sales calls, qualify leads, and close deals faster with our enterprise-grade voice agents.
          </p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
              <Globe className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Multi-Language</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Real-Time Analytics</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {/* Agent Cards Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">Choose Your AI Agent</h2>
            <p className="text-muted-foreground">Select an agent tailored to your industry needs</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <AgentCard
              title="B2B Sales Copilot"
              description="AI phone agent for startups & MSMEs to qualify B2B leads"
              features={b2bFeatures}
              tags={["Azure OpenAI", "Voice Coaching"]}
              ctaText="Launch Sales Copilot"
              ctaLink="/b2b"
              icon={Zap}
              variant="primary"
            />
            <AgentCard
              title="Real Estate Agent"
              description="AI phone agent for real estate lead qualification"
              features={realEstateFeatures}
              tags={["Murf AI Voices", "Hindi + English"]}
              ctaText="Launch Real Estate Agent"
              ctaLink="/real-estate"
              icon={Building2}
              variant="secondary"
            />
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">Platform Capabilities</h2>
            <p className="text-muted-foreground">Everything you need to scale your voice operations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: "Intelligent Dialing",
                description: "Smart call routing and automatic retries with optimal timing",
              },
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                description: "Live dashboards with sentiment analysis and conversion tracking",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "SOC 2 compliant with end-to-end encryption for all calls",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="glass-card p-6 text-center group hover:border-primary/30 transition-colors"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
