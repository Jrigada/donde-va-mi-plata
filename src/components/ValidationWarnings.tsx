"use client";

import { ValidationIssue } from "@/lib/parser/types";

interface ValidationWarningsProps {
  issues: ValidationIssue[];
  onDismiss?: () => void;
}

export function ValidationWarnings({
  issues,
  onDismiss,
}: ValidationWarningsProps) {
  const warnings = issues.filter((i) => i.severity === "warning");

  if (warnings.length === 0) return null;

  return (
    <div className="mb-6 p-4 border-l-4 border-[var(--warning)] bg-[var(--bg-secondary)] animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-[var(--warning)] mb-2">
            Análisis incompleto
          </p>
          <ul className="text-sm space-y-1 text-[var(--text-secondary)]">
            {warnings.map((w) => (
              <li key={w.code} className="flex gap-2">
                <span className="text-[var(--warning)] shrink-0">—</span>
                <span>
                  {w.message}
                  {w.suggestion && (
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      ({w.suggestion})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
