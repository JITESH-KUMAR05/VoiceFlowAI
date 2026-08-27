export type AgentType = "b2b" | "real-estate";

export type InterestLevel = "high" | "medium" | "low" | "none";
export type LeadStatus =
  "new" | "contacted" | "qualified" | "converted" | "lost";
export type CallOutcome = "completed" | "follow-up" | "missed";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  budget?: string;
  location?: string;
  propertyType?: string;
  buyOrRent?: "buy" | "rent";
  interestLevel: InterestLevel;
  status: LeadStatus;
  createdAt: string;
  lastContactedAt?: string;
  notes?: string;
}

export interface Call {
  id: string;
  userId: string;
  leadName: string;
  email: string;
  callDate: string;
  callTime: string;
  interestLevel: InterestLevel;
  duration: string;
  status: CallOutcome;
  nextAction: string;
  summary?: string;
  objections?: string[];
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  basePath: string;
  /** What the agent is instructed to do on a call, in the order it does it. */
  conversationSteps: string[];
}

/**
 * Describes each agent persona.
 *
 * These are the two prompts the backend ships, so the descriptions here have
 * to match app/personas.py. There are no metrics in this file: anything
 * countable is counted from the leads the API returns.
 */
export const agentConfigs: Record<AgentType, AgentConfig> = {
  b2b: {
    type: "b2b",
    name: "B2B Sales",
    description:
      "Qualifies inbound SaaS leads by phone and books a demo when the fit is there.",
    basePath: "/b2b",
    conversationSteps: [
      "Ask about their current sales process",
      "Listen for the pain point behind the answer",
      "Explain how the product addresses that specific problem",
      "Propose a demo",
    ],
  },
  "real-estate": {
    type: "real-estate",
    name: "Real Estate",
    description:
      "Qualifies property enquiries in Hindi or English and proposes a site visit.",
    basePath: "/real-estate",
    conversationSteps: [
      "Establish whether this is for investment or self-use",
      "Ask about preferred location and budget range",
      "Match against available inventory",
      "Propose a site visit",
    ],
  },
};
