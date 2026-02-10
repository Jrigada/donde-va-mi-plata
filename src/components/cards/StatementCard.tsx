"use client";

import { StoredStatement } from "@/lib/storage";
import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface StatementCardProps {
  statement: StoredStatement;
  onClick: () => void;
}

function formatPeriodShort(periodTo: string): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const [year, month] = periodTo.split("-").map(Number);
  return `${months[month - 1]} ${year}`;
}

export function StatementCard({ statement, onClick }: StatementCardProps) {
  const { analysis } = statement;
  const balanceChange = analysis.closingBalance - analysis.openingBalance;
  const isPositive = balanceChange >= 0;

  return (
    <button
      onClick={onClick}
      className="card p-4 sm:p-6 text-left w-full hover:border-[var(--accent)] transition-colors group cursor-pointer"
    >
      {/* Header: Month and Saldo Final */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors">
            {formatPeriodShort(statement.periodTo)}
          </h3>
        </div>
        <span className="text-[var(--accent)] text-sm group-hover:underline shrink-0">
          Ver detalle →
        </span>
      </div>

      {/* Main: Saldo Final prominente */}
      <div className="mt-3">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Saldo final</p>
        <p className="text-2xl font-mono font-bold mt-1">
          {formatArgentineCurrency(analysis.closingBalance)}
        </p>
      </div>

      {/* Footer: Variación e ingresos/egresos */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <span className="text-[var(--positive)]">+{formatArgentineCurrency(analysis.totalCredits)}</span>
          <span className="text-[var(--negative)]">-{formatArgentineCurrency(analysis.totalDebits)}</span>
        </div>
        <div className="text-right flex items-center gap-1">
          <span
            className={`font-mono text-sm font-semibold ${
              isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {isPositive ? "+" : ""}{formatArgentineCurrency(balanceChange)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            variación
          </span>
        </div>
      </div>
    </button>
  );
}
