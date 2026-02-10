"use client";

import { Subscription } from "@/lib/parser/types";
import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface SubscriptionsCardProps {
  subscriptions: Subscription[];
}

export function SubscriptionsCard({ subscriptions }: SubscriptionsCardProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="card p-6 animate-slide-up stagger-3">
        <h3 className="text-lg font-semibold mb-4">Suscripciones</h3>
        <p className="text-[var(--text-muted)]">
          No detectamos suscripciones en este período
        </p>
      </div>
    );
  }

  const totalSubscriptions = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const hasHighAmount = subscriptions.some((s) => s.isHighAmount);

  return (
    <div
      className={`card p-6 animate-slide-up stagger-3 ${
        hasHighAmount ? "border-[var(--warning)]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Suscripciones</h3>
          {hasHighAmount && (
            <span className="tag border-[var(--warning)] text-[var(--warning)]">
              ⚠️ Revisar
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {subscriptions.length} detectada{subscriptions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-3">
        {subscriptions.map((subscription, index) => (
          <div
            key={`${subscription.name}-${index}`}
            className={`flex items-center justify-between gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0 ${
              subscription.isHighAmount ? "text-[var(--warning)]" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: subscription.type === "debin" ? "#F59E0B" : "#8B5CF6" }}
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{subscription.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {subscription.type === "debin"
                    ? "Débito automático"
                    : "Servicio"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`font-mono font-medium text-sm sm:text-base ${
                  subscription.isHighAmount ? "text-[var(--warning)]" : ""
                }`}
              >
                {formatArgentineCurrency(subscription.amount)}
                {subscription.isHighAmount && " ⚠️"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">/mes</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-[var(--text-muted)]">Total mensual</span>
        <span className="font-mono font-semibold text-lg">
          {formatArgentineCurrency(totalSubscriptions)}
        </span>
      </div>
    </div>
  );
}
