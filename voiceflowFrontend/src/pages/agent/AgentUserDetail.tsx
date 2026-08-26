import { Link, useParams } from "react-router-dom";

import { EmptyState, ErrorState, LoadingRows } from "@/components/DataState";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { scoreColor, scoreLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentUserDetailProps {
  agentType: AgentType;
}

/** A field is only rendered when Salesforce actually returned something. */
const PLACEHOLDERS = new Set([
  "",
  "N/A",
  "Unknown",
  "Processing...",
  "Analysis pending",
  "Not identified",
  "No transcript available",
]);

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value) && !PLACEHOLDERS.has(value as string);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

export default function AgentUserDetail({ agentType }: AgentUserDetailProps) {
  const { id } = useParams<{ id: string }>();
  const config = agentConfigs[agentType];
  const { leads, isLoading, error, reload } = useLeads(agentType);

  const lead = leads.find((candidate) => candidate.id === id);

  const analysis = [
    { label: "Summary", value: lead?.summary },
    { label: "Pain points", value: lead?.pain_points },
    { label: "Company type", value: lead?.company_type },
    { label: "Persona", value: lead?.lifestyle },
    { label: "Conversion verdict", value: lead?.verdict },
  ].filter((field) => hasValue(field.value));

  return (
    <AgentLayout agentType={agentType}>
      <div className="container mx-auto max-w-3xl pb-16">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
          <Link to={`${config.basePath}/crm`}>&larr; Back to leads</Link>
        </Button>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : isLoading ? (
          <LoadingRows rows={4} />
        ) : !lead ? (
          <EmptyState
            title="Lead not found"
            description="This lead may have been removed, or it belongs to the other agent."
            action={
              <Button asChild variant="outline">
                <Link to={`${config.basePath}/crm`}>Back to leads</Link>
              </Button>
            }
          />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-3xl font-bold">{lead.name}</h1>
              <div className="mt-2 space-y-0.5 font-mono text-sm text-muted-foreground">
                {lead.company && <p>{lead.company}</p>}
                {lead.email && <p>{lead.email}</p>}
              </div>
            </header>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="panel p-4">
                <p className="label-caps">Lead score</p>
                <p
                  className={cn(
                    "mt-2 font-mono text-2xl font-medium tabular-nums",
                    scoreColor(lead.score),
                  )}
                >
                  {lead.score}
                  <span className="ml-1 text-xs text-muted-foreground">
                    of 100
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scoreLabel(lead.score)}
                </p>
              </div>
              <div className="panel p-4">
                <p className="label-caps">Sentiment</p>
                <p className="mt-2 text-sm">{lead.sentiment}</p>
              </div>
              <div className="panel p-4">
                <p className="label-caps">Salesforce status</p>
                <p className="mt-2 text-sm">{lead.status}</p>
              </div>
            </div>

            {analysis.length > 0 && (
              <section className="mb-6">
                <h2 className="label-caps mb-3">Call analysis</h2>
                <dl className="panel divide-y divide-border">
                  {analysis.map((field) => (
                    <Field
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </dl>
              </section>
            )}

            {hasValue(lead.transcript) && (
              <section>
                <h2 className="label-caps mb-3">Transcript</h2>
                <pre className="panel max-h-96 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
                  {lead.transcript}
                </pre>
              </section>
            )}
          </>
        )}
      </div>
    </AgentLayout>
  );
}
