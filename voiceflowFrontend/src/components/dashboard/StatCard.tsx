import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** null renders a dash: the metric exists, there is just nothing to count. */
  value: string | number | null;
  /** Unit or qualifier shown after the value, e.g. "of 100" or "leads". */
  unit?: string;
  hint?: string;
  className?: string;
}

/**
 * One measured value.
 *
 * No trend badges. The previous version rendered hardcoded "+18%" changes
 * against nothing, and there is no historical series behind this data to
 * compute a real one from.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  className,
}: StatCardProps) {
  const isEmpty = value === null || value === "";

  return (
    <div className={cn("panel p-4", className)}>
      <p className="label-caps">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-2xl font-medium tabular-nums",
            isEmpty && "text-muted-foreground",
          )}
        >
          {isEmpty ? "—" : value}
        </span>
        {unit && !isEmpty && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
