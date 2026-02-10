"use client";

import { TaxSummary } from "@/lib/parser/types";
import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface TaxesCardProps {
  taxes: TaxSummary;
}

export function TaxesCard({ taxes }: TaxesCardProps) {
  if (taxes.totalTaxes === 0 && taxes.creditableAmount === 0) {
    return (
      <div className="card p-6 animate-slide-up stagger-4">
        <h3 className="text-lg font-semibold mb-4">Impuestos</h3>
        <p className="text-[var(--text-muted)]">
          No hay impuestos o percepciones en este período
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 animate-slide-up stagger-4">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: "#6366F1" }}
        />
        <h3 className="text-lg font-semibold">Impuestos y percepciones</h3>
      </div>

      {/* Tax items */}
      {taxes.items.length > 0 && (
        <div className="space-y-4 mb-6">
          {taxes.items.map((item, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
            >
              <span className="text-[var(--text-secondary)] text-sm leading-relaxed">
                {item.description}
              </span>
              <span className="font-mono text-[var(--negative)] shrink-0">
                -{formatArgentineCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total and creditable */}
      <div className="bg-[var(--bg-secondary)] p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Total pagado en impuestos</span>
          <span className="font-mono font-semibold text-lg text-[var(--negative)] shrink-0">
            -{formatArgentineCurrency(taxes.totalTaxes)}
          </span>
        </div>

        {taxes.creditableAmount > 0 && (
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
            <div>
              <span className="text-[var(--text-secondary)]">
                Crédito fiscal computable
              </span>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Podés usar esto para pago a cuenta de otros impuestos
              </p>
            </div>
            <span className="font-mono text-[var(--positive)] shrink-0">
              +{formatArgentineCurrency(taxes.creditableAmount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
