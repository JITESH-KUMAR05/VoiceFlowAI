import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The three states a data view can be in besides showing data.
 *
 * Fetches used to have no error path at all, so a backend that was not running
 * looked identical to a CRM with no leads in it. These keep those apart.
 */

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="panel p-6" role="alert">
      <p className="font-medium">Could not load this data</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="panel px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Marks a view still rendering sample data rather than API data. */
export function SampleDataNotice() {
  return (
    <p className="mb-4 inline-flex items-center gap-2 rounded-sm border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs text-warning">
      <span className="status-dot bg-warning" />
      Sample data — this view is not wired to the API yet
    </p>
  );
}
