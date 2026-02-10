"use client";

import { Alert } from "@/lib/parser/types";

interface AlertsCardProps {
  alerts: Alert[];
}

const ALERT_COLORS: Record<Alert["type"], string> = {
  subscription: "#8B5CF6",
  high_tax: "#6366F1",
  credit_card_note: "#3B82F6",
  high_amount: "#22C55E",
};

export function AlertsCard({ alerts }: AlertsCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 animate-slide-up stagger-1">
      {alerts.map((alert, index) => {
        const color = ALERT_COLORS[alert.type] || "var(--accent)";
        return (
          <div
            key={index}
            className="p-4 bg-[var(--bg-secondary)]"
            style={{ borderLeft: `4px solid ${color}` }}
          >
            <h4
              className="font-semibold"
              style={{ color }}
            >
              {alert.title}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {alert.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
