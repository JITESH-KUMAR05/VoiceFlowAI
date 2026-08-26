import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingRows } from "@/components/DataState";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLeads } from "@/hooks/useLeads";
import type { CrmLead } from "@/lib/api";
import { scoreColor, scoreLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentCRMProps {
  agentType: AgentType;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "interested", label: "Interested" },
  { key: "neutral", label: "Neutral" },
  { key: "not-interested", label: "Not interested" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(lead: CrmLead, filter: FilterKey): boolean {
  switch (filter) {
    case "interested":
      return lead.score >= 70;
    case "neutral":
      return lead.score >= 40 && lead.score < 70;
    case "not-interested":
      return lead.score < 40;
    default:
      return true;
  }
}

export default function AgentCRM({ agentType }: AgentCRMProps) {
  const config = agentConfigs[agentType];
  const { leads, stats, isLoading, error, reload } = useLeads(agentType);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (!matchesFilter(lead, filter)) return false;
      if (!needle) return true;
      return (
        (lead.name ?? "").toLowerCase().includes(needle) ||
        (lead.company ?? "").toLowerCase().includes(needle) ||
        (lead.email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [leads, filter, query]);

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto pb-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <CRMSidebar agentType={agentType} />

          <div className="min-w-0 flex-1">
            <header className="mb-8">
              <h1 className="text-3xl font-bold">Leads</h1>
              <p className="mt-2 text-muted-foreground">
                Leads {config.name} has scored and written to Salesforce.
              </p>
            </header>

            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : isLoading ? (
              <LoadingRows rows={5} />
            ) : leads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="When this agent finishes a call, the scored lead is synced to Salesforce and appears here."
                action={
                  <Button asChild>
                    <Link to={`${config.basePath}/test`}>Start a call</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  <StatCard label="Total leads" value={stats.total} />
                  <StatCard
                    label="Interested"
                    value={stats.interested}
                    hint="Scored 70 or above"
                  />
                  <StatCard
                    label="Average score"
                    value={stats.averageScore}
                    unit="of 100"
                  />
                </div>

                <div className="panel mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
                  <Input
                    placeholder="Search by name, company or email"
                    className="md:max-w-xs"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search leads"
                  />
                  <div className="flex flex-wrap gap-1">
                    {FILTERS.map((option) => (
                      <Button
                        key={option.key}
                        variant={filter === option.key ? "secondary" : "ghost"}
                        size="sm"
                        aria-pressed={filter === option.key}
                        onClick={() => setFilter(option.key)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {visible.length === 0 ? (
                  <EmptyState
                    title="No leads match"
                    description="Try a different search term or clear the filter."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          setFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <ul className="panel divide-y divide-border">
                    {visible.map((lead) => (
                      <li key={lead.id} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="truncate font-medium">{lead.name}</p>
                          <p
                            className={cn(
                              "shrink-0 font-mono text-sm tabular-nums",
                              scoreColor(lead.score),
                            )}
                          >
                            {lead.score}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {scoreLabel(lead.score)}
                            </span>
                          </p>
                        </div>
                        {lead.company && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {lead.company}
                          </p>
                        )}
                        {lead.summary && lead.summary !== "Processing..." && (
                          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                            {lead.summary}
                          </p>
                        )}
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
