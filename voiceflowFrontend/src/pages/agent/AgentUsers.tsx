import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingRows } from "@/components/DataState";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLeads } from "@/hooks/useLeads";
import { scoreColor, scoreLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentUsersProps {
  agentType: AgentType;
}

/** First letters of the first two words, for the avatar tile. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function AgentUsers({ agentType }: AgentUsersProps) {
  const config = agentConfigs[agentType];
  const { leads, isLoading, error, reload } = useLeads(agentType);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter(
      (lead) =>
        (lead.name ?? "").toLowerCase().includes(needle) ||
        (lead.company ?? "").toLowerCase().includes(needle) ||
        (lead.email ?? "").toLowerCase().includes(needle),
    );
  }, [leads, query]);

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <CRMSidebar agentType={agentType} />

          <div className="min-w-0 flex-1">
            <header className="mb-8">
              <h1 className="text-3xl font-bold">People</h1>
              <p className="mt-2 text-muted-foreground">
                Everyone {config.name} has spoken to.
              </p>
            </header>

            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : isLoading ? (
              <LoadingRows rows={4} />
            ) : leads.length === 0 ? (
              <EmptyState
                title="Nobody yet"
                description="People appear here once the agent has completed a call with them."
                action={
                  <Button asChild>
                    <Link to={`${config.basePath}/test`}>Start a call</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <Input
                  placeholder="Search by name, company or email"
                  className="mb-4 max-w-xs"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search people"
                />

                {visible.length === 0 ? (
                  <EmptyState
                    title="No matches"
                    description="Try a different search term."
                  />
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {visible.map((lead) => (
                      <li key={lead.id} className="panel p-4">
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium text-muted-foreground"
                          >
                            {initials(lead.name) || "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{lead.name}</p>
                            {lead.company && (
                              <p className="truncate text-sm text-muted-foreground">
                                {lead.company}
                              </p>
                            )}
                            {lead.email && (
                              <p className="truncate font-mono text-xs text-muted-foreground">
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <dl className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                          <div>
                            <dt className="label-caps">Score</dt>
                            <dd
                              className={cn(
                                "font-mono text-sm tabular-nums",
                                scoreColor(lead.score),
                              )}
                            >
                              {lead.score}{" "}
                              <span className="text-xs text-muted-foreground">
                                {scoreLabel(lead.score)}
                              </span>
                            </dd>
                          </div>
                          <div className="text-right">
                            <dt className="label-caps">Last call</dt>
                            <dd className="font-mono text-sm">
                              {formatDate(lead.last_contact)}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
