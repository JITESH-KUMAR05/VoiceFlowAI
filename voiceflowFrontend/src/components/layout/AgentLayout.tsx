import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agentConfigs, type AgentType } from "@/types/agent";

interface AgentLayoutProps {
  children: ReactNode;
  agentType: AgentType;
}

const sections = (basePath: string) => [
  { path: basePath, label: "Overview", exact: true },
  { path: `${basePath}/crm`, label: "Leads" },
  { path: `${basePath}/crm/calls`, label: "Calls" },
  { path: `${basePath}/crm/users`, label: "People" },
  { path: `${basePath}/analytics`, label: "Analytics" },
];

/**
 * Chrome for the agent consoles: which agent you are in, and where inside it.
 *
 * Two rows rather than one. The top row is the product, the second is this
 * agent's sections, so switching agent and switching section are visibly
 * different moves.
 */
export function AgentLayout({ children, agentType }: AgentLayoutProps) {
  const location = useLocation();
  const config = agentConfigs[agentType];
  const items = sections(config.basePath);
  const other = agentType === "b2b" ? "real-estate" : "b2b";

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between gap-6">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="font-display text-base font-bold tracking-tight"
            >
              VoiceFlow
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <span className="text-sm font-medium">{config.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={agentConfigs[other].basePath}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Switch to {agentConfigs[other].name}
            </Link>
            <Button asChild size="sm">
              <Link to={`${config.basePath}/test`}>Start a call</Link>
            </Button>
          </div>
        </div>

        <nav
          aria-label={`${config.name} sections`}
          className="container mx-auto flex h-10 items-center gap-1 overflow-x-auto border-t border-border"
        >
          {items.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-sm px-2.5 py-1 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-6 pt-32">{children}</main>
    </div>
  );
}
