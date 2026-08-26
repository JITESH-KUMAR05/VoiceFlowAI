import { Link } from "react-router-dom";

import { ErrorState, LoadingRows } from "@/components/DataState";
import { StatCard } from "@/components/dashboard/StatCard";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { scoreColor } from "@/lib/status";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentDashboardProps {
  agentType: AgentType;
}

/**
 * One dashboard, parameterised by agent.
 *
 * B2B and real estate previously had separate near-identical page files that
 * had already drifted apart in wording and layout.
 */
export default function AgentDashboard({ agentType }: AgentDashboardProps) {
  const config = agentConfigs[agentType];
  const { stats, isLoading, error, reload } = useLeads(agentType);

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold">{config.name}</h1>
          <p className="mt-2 text-muted-foreground">{config.description}</p>
        </header>

        <div className="mb-10 flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`${config.basePath}/test`}>Start a call</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`${config.basePath}/crm`}>View leads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`${config.basePath}/analytics`}>Analytics</Link>
          </Button>
        </div>

        <section className="mb-10">
          <h2 className="label-caps mb-3">Leads from this agent</h2>

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : isLoading ? (
            <LoadingRows rows={1} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Leads contacted"
                value={stats.total}
                hint={stats.total === 0 ? "No calls logged yet" : undefined}
              />
              <StatCard
                label="Interested"
                value={stats.interested}
                hint="Scored 70 or above"
              />
              <StatCard
                label="Needs follow-up"
                value={stats.neutral}
                hint="Scored 40 to 69"
              />
              <StatCard
                label="Average score"
                value={stats.averageScore}
                unit={stats.averageScore === null ? undefined : "of 100"}
                className={
                  stats.averageScore === null
                    ? undefined
                    : scoreColor(stats.averageScore)
                }
              />
            </div>
          )}
        </section>

        <section>
          <h2 className="label-caps mb-3">What this agent does on a call</h2>
          <ol className="panel divide-y divide-border">
            {config.conversationSteps.map((step, index) => (
              <li key={step} className="flex gap-4 px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            These steps come from the agent&rsquo;s system prompt in{" "}
            <code className="font-mono">backend/app/personas.py</code>.
          </p>
        </section>
      </div>
    </AgentLayout>
  );
}
