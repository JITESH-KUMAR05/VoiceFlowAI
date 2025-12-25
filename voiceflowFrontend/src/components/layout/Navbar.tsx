import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, BarChart3, Home, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/b2b", label: "B2B Sales", icon: Zap },
  { path: "/real-estate", label: "Real Estate", icon: Phone },
];

export function Navbar() {
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg">
            <Phone className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-cyan-400 opacity-50 blur-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">VoiceFlow AI</span>
            <span className="text-xs text-muted-foreground">Voice Intelligence Platform</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/live-call"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
          >
            <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
            Live Demo
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
