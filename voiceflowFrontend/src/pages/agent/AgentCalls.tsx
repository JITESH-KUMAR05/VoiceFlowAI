import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingRows } from "@/components/DataState";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { scoreColor, scoreLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentCallsProps {
  agentType: AgentType;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calls, newest first.
 *
 * One row per lead rather than per call: the backend records the most recent
 * call onto the Lead, so there is no per-call history to page through. The
 * previous version filled that gap with a hardcoded "2m 30s" duration on every
 * row, which was not a real measurement.
 */
export default function AgentCalls({ agentType }: AgentCallsProps) {
  const config = agentConfigs[agentType];
  const { leads, isLoading, error, reload } = useLeads(agentType);

  const ordered = [...leads].sort((a, b) =>
    (b.last_contact ?? "").localeCompare(a.last_contact ?? ""),
  );

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Calls</h1>
          <p className="mt-2 text-muted-foreground">
            The most recent call from {config.name}, per lead.
          </p>
        </header>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : isLoading ? (
          <LoadingRows rows={5} />
        ) : ordered.length === 0 ? (
          <EmptyState
            title="No calls yet"
            description="Completed calls appear here once the lead has been synced to Salesforce."
            action={
              <Button asChild>
                <Link to={`${config.basePath}/test`}>Start a call</Link>
              </Button>
            }
          />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Calls made by {config.name}, newest first
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="label-caps px-4 py-2.5">
                    Lead
                  </th>
                  <th scope="col" className="label-caps px-4 py-2.5">
                    When
                  </th>
                  <th scope="col" className="label-caps px-4 py-2.5">
                    Score
                  </th>
                  <th scope="col" className="label-caps px-4 py-2.5">
                    Outcome
                  </th>
                  <th scope="col" className="sr-only">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{lead.name}</p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground">
                          {lead.company}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {formatWhen(lead.last_contact)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 font-mono tabular-nums",
                        scoreColor(lead.score),
                      )}
                    >
                      {lead.score}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {scoreLabel(lead.score)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`${config.basePath}/crm/user/${lead.id}`}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
