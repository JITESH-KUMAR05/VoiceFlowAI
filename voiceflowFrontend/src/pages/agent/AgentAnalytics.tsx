import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingRows } from "@/components/DataState";
import { StatCard } from "@/components/dashboard/StatCard";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentAnalyticsProps {
  agentType: AgentType;
}

const BANDS = [
  {
    key: "interested",
    label: "Interested",
    range: "70–100",
    tone: "bg-score-high",
  },
  { key: "neutral", label: "Neutral", range: "40–69", tone: "bg-score-mid" },
  {
    key: "notInterested",
    label: "Not interested",
    range: "0–39",
    tone: "bg-score-low",
  },
] as const;

export default function AgentAnalytics({ agentType }: AgentAnalyticsProps) {
  const config = agentConfigs[agentType];
  const { stats, isLoading, error, reload } = useLeads(agentType);

  const counts = {
    interested: stats.interested,
    neutral: stats.neutral,
    notInterested: stats.notInterested,
  };

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Every figure here is counted from the leads {config.name} has
            written to Salesforce. There is no historical series behind them, so
            no trends are shown.
          </p>
        </header>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : isLoading ? (
          <LoadingRows rows={2} />
        ) : stats.total === 0 ? (
          <EmptyState
            title="No calls logged yet"
            description="Once this agent completes a call and syncs the lead, its score and outcome appear here."
            action={
              <Button asChild>
                <Link to={`${config.basePath}/test`}>Start a call</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Leads contacted" value={stats.total} />
              <StatCard
                label="Average score"
                value={stats.averageScore}
                unit="of 100"
              />
              <StatCard
                label="Last call"
                value={
                  stats.lastContact
                    ? new Date(stats.lastContact).toLocaleDateString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )
                    : null
                }
              />
            </div>

            <section>
              <h2 className="label-caps mb-3">Score distribution</h2>
              <div className="panel divide-y divide-border">
                {BANDS.map((band) => {
                  const count = counts[band.key];
                  const share = stats.total ? (count / stats.total) * 100 : 0;

                  return (
                    <div key={band.key} className="px-4 py-3">
                      <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="text-sm">
                          {band.label}{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            {band.range}
                          </span>
                        </span>
                        <span className="font-mono text-sm tabular-nums">
                          {count}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {share.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${band.label}: ${count} of ${stats.total} leads`}
                      >
                        <div
                          className={cn("h-full rounded-full", band.tone)}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Bands match the thresholds in{" "}
                <code className="font-mono">
                  backend/app/services/salesforce_service.py
                </code>
                .
              </p>
            </section>
          </>
        )}
      </div>
    </AgentLayout>
  );
}
