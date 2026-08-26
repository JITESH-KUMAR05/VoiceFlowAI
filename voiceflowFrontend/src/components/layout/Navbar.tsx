import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Overview" },
  { path: "/b2b", label: "B2B Sales" },
  { path: "/real-estate", label: "Real Estate" },
];

export function Navbar() {
  const location = useLocation();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background">
      <div className="container mx-auto flex h-full items-center justify-between gap-8">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-base font-bold tracking-tight">
            VoiceFlow
          </span>
          <span className="label-caps">Agent Console</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm transition-colors",
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
      </div>
    </header>
  );
}
