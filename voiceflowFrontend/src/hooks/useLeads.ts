import { useCallback, useEffect, useMemo, useState } from "react";

import { api, describeError, type CrmLead } from "@/lib/api";

export interface LeadStats {
  total: number;
  interested: number;
  neutral: number;
  notInterested: number;
  /** Mean lead score, or null when there is nothing to average. */
  averageScore: number | null;
  lastContact: string | null;
}

/**
 * Every figure shown on a dashboard is counted here, from leads the API
 * returned. Nothing in this file has a default value to fall back on: with no
 * calls logged, the counts are zero and the pages say so.
 */
export function summarise(leads: CrmLead[]): LeadStats {
  const scores = leads.map((lead) => lead.score);

  const timestamps = leads
    .map((lead) => lead.last_contact)
    .filter(Boolean)
    .sort();

  return {
    total: leads.length,
    interested: scores.filter((score) => score >= 70).length,
    neutral: scores.filter((score) => score >= 40 && score < 70).length,
    notInterested: scores.filter((score) => score < 40).length,
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null,
    lastContact: timestamps.length ? timestamps[timestamps.length - 1] : null,
  };
}

export interface UseLeadsResult {
  leads: CrmLead[];
  stats: LeadStats;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/** Load the leads for one agent, with the states a real request has. */
export function useLeads(agentType: string): UseLeadsResult {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .leads(agentType)
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch((cause) => {
        if (!cancelled) setError(describeError(cause));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentType]);

  useEffect(() => load(), [load]);

  const stats = useMemo(() => summarise(leads), [leads]);

  return { leads, stats, isLoading, error, reload: load };
}
