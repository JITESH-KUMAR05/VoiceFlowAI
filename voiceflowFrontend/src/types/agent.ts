export type AgentType = 'b2b' | 'real-estate';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  budget?: string;
  location?: string;
  propertyType?: string;
  buyOrRent?: 'buy' | 'rent';
  interestLevel: 'high' | 'medium' | 'low' | 'none';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
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
  interestLevel: 'high' | 'medium' | 'low' | 'none';
  duration: string;
  status: 'completed' | 'follow-up' | 'missed';
  nextAction: string;
  summary?: string;
  objections?: string[];
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  color: 'primary' | 'secondary';
  basePath: string;
  features: string[];
  kpis: {
    totalCalls: number;
    interestedLeads: number;
    followUpsNeeded: number;
    avgCallDuration: string;
    conversionRate: string;
  };
}

export const agentConfigs: Record<AgentType, AgentConfig> = {
  b2b: {
    type: 'b2b',
    name: 'B2B Sales Copilot',
    description: 'AI phone agent for startups & MSMEs to qualify B2B leads',
    color: 'primary',
    basePath: '/b2b',
    features: [
      'Live conversation analysis',
      'Objection handling scripts',
      'Competitor battle cards',
      'CRM auto-sync',
      'Deal progression tracking',
    ],
    kpis: {
      totalCalls: 1247,
      interestedLeads: 342,
      followUpsNeeded: 89,
      avgCallDuration: '4:32',
      conversionRate: '27.4%',
    },
  },
  'real-estate': {
    type: 'real-estate',
    name: 'Real Estate Agent',
    description: 'AI phone agent for real estate lead qualification',
    color: 'secondary',
    basePath: '/real-estate',
    features: [
      'Automated lead qualification',
      'Property matching & recommendations',
      'Site visit scheduling',
      'Multi-language support (Hindi + English)',
      'Investment analysis',
    ],
    kpis: {
      totalCalls: 892,
      interestedLeads: 234,
      followUpsNeeded: 56,
      avgCallDuration: '5:18',
      conversionRate: '26.2%',
    },
  },
};
