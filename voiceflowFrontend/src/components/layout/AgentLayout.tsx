import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  BarChart3, 
  ChevronRight,
  ArrowLeft,
  Zap,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentType, agentConfigs } from "@/types/agent";

interface AgentLayoutProps {
  children: ReactNode;
  agentType: AgentType;
}

const getNavItems = (basePath: string) => [
  { path: basePath, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: `${basePath}/crm`, label: "CRM", icon: Users },
  { path: `${basePath}/test`, label: "Start a call", icon: Phone },
  { path: `${basePath}/analytics`, label: "Analytics", icon: BarChart3 },
];

export function AgentLayout({ children, agentType }: AgentLayoutProps) {
  const location = useLocation();
  const config = agentConfigs[agentType];
  const navItems = getNavItems(config.basePath);
  const isPrimary = agentType === "b2b";

  // Build breadcrumb
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
    path: "/" + pathParts.slice(0, index + 1).join("/"),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20",
          "bg-primary"
        )} />
        <div className={cn(
          "absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10",
          "bg-cyan-500"
        )} />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Home</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link to={config.basePath} className="flex items-center gap-3">
              <div className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                "bg-primary"
              )}>
                {isPrimary ? (
                  <Zap className="h-5 w-5 text-primary-foreground" />
                ) : (
                  <Building2 className="h-5 w-5 text-secondary-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">{config.name}</span>
                <span className="text-xs text-muted-foreground">VoiceFlow AI</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== config.basePath;
              const isExactDashboard = item.exact && location.pathname === item.path;
              const shouldHighlight = isExactDashboard || isActive;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    shouldHighlight
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {shouldHighlight && (
                    <motion.div
                      layoutId={`agent-nav-${agentType}`}
                      className={cn(
                        "absolute inset-0 rounded-lg border",
                        "bg-primary/10 border-primary/20"
                      )}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <Link
            to={`${config.basePath}/test`}
            className={cn(
              "hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-lg hover:opacity-90 transition-opacity",
              "bg-primary text-primary-foreground"
            )}
          >
            Start a call
          </Link>
        </div>
      </motion.header>

      {/* Breadcrumb */}
      <div className="pt-20 px-6">
        <div className="container mx-auto">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-foreground">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
