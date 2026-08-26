import { Phone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentType } from "@/types/agent";

export type TestMode = "phone" | "browser";

interface TestModeSelectorProps {
  mode: TestMode;
  onChange: (mode: TestMode) => void;
  agentType: AgentType;
}

export function TestModeSelector({ mode, onChange, agentType }: TestModeSelectorProps) {
  const isPrimary = agentType === "b2b";

  return (
    <div className="flex p-1 rounded-xl bg-muted/50 border border-border">
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
          mode === "phone"
            ? "bg-primary text-primary-foreground shadow-lg"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Phone className="h-4 w-4" />
        Phone Testing
      </button>
      <button
        type="button"
        onClick={() => onChange("browser")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
          mode === "browser"
            ? "bg-primary text-primary-foreground shadow-lg"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Monitor className="h-4 w-4" />
        Browser Testing
      </button>
    </div>
  );
}
