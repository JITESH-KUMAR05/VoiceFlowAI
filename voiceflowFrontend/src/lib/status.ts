/**
 * Colour for lead and call state.
 *
 * These maps were duplicated across five components, each with slightly
 * different raw Tailwind colours for the same state, so a lead shown as
 * "qualified" in a table did not match the same lead on its detail page.
 *
 * Every value here resolves to a semantic token. Saturated colour in this
 * interface means something: green is a good outcome, red a lost one, amber
 * a line that is currently open. Nothing is coloured to look lively.
 */

import type { InterestLevel, LeadStatus } from "@/types/agent";

const BADGE = "border font-medium";

export const interestColors: Record<InterestLevel, string> = {
  high: `${BADGE} border-score-high/30 bg-score-high/10 text-score-high`,
  medium: `${BADGE} border-score-mid/30 bg-score-mid/10 text-score-mid`,
  low: `${BADGE} border-border bg-muted text-muted-foreground`,
  none: `${BADGE} border-border bg-muted text-muted-foreground`,
};

export const statusColors: Record<LeadStatus, string> = {
  new: `${BADGE} border-border bg-muted text-muted-foreground`,
  contacted: `${BADGE} border-primary/30 bg-primary/10 text-primary`,
  qualified: `${BADGE} border-score-high/30 bg-score-high/10 text-score-high`,
  converted: `${BADGE} border-score-high/40 bg-score-high/15 text-score-high`,
  lost: `${BADGE} border-destructive/30 bg-destructive/10 text-destructive`,
};

export const callOutcomeColors: Record<string, string> = {
  completed: `${BADGE} border-score-high/30 bg-score-high/10 text-score-high`,
  "follow-up": `${BADGE} border-primary/30 bg-primary/10 text-primary`,
  missed: `${BADGE} border-destructive/30 bg-destructive/10 text-destructive`,
};

/** Band a 0-100 lead score, matching the backend's sentiment thresholds. */
export function scoreColor(score: number): string {
  if (score >= 70) return "text-score-high";
  if (score >= 40) return "text-score-mid";
  return "text-score-low";
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "Interested";
  if (score >= 40) return "Neutral";
  return "Not interested";
}

/** Fall back to the neutral badge rather than rendering an unstyled one. */
export function badgeFor(
  map: Record<string, string>,
  key: string | undefined,
): string {
  return (
    (key && map[key]) ?? `${BADGE} border-border bg-muted text-muted-foreground`
  );
}
