import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Phone, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentType, agentConfigs } from "@/types/agent";

interface CRMSidebarProps {
  agentType: AgentType;
}

const getCRMNavItems = (basePath: string) => [
  { path: `${basePath}/crm`, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: `${basePath}/crm/users`, label: "Users", icon: Users },
  { path: `${basePath}/crm/calls`, label: "Calls", icon: Phone },
];

export function CRMSidebar({ agentType }: CRMSidebarProps) {
  const location = useLocation();
  const config = agentConfigs[agentType];
  const navItems = getCRMNavItems(config.basePath);
  const isPrimary = config.color === "primary";

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="glass-card p-4 sticky top-28">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-3">CRM Navigation</h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && !item.exact;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? isPrimary ? "text-primary" : "text-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={`crm-nav-${agentType}`}
                    className={cn(
                      "absolute inset-0 rounded-lg border",
                      isPrimary 
                        ? "bg-primary/10 border-primary/20"
                        : "bg-secondary/10 border-secondary/20"
                    )}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
