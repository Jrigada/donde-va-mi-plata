"use client";

import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface SummaryCardProps {
  periodFrom: string;
  periodTo: string;
  accountHolder: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
}

function formatPeriod(from: string, to: string): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  // Parse ISO date string directly to avoid timezone issues
  const parseISODate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return { year, month: month - 1, day }; // month is 0-indexed
  };

  const fromParts = parseISODate(from);
  const toParts = parseISODate(to);

  const fromStr = `${fromParts.day} ${months[fromParts.month]}`;
  const toStr = `${toParts.day} ${months[toParts.month]} ${toParts.year}`;

  return `${fromStr} — ${toStr}`;
}

export function SummaryCard({
  periodFrom,
  periodTo,
  accountHolder,
  openingBalance,
  closingBalance,
  totalCredits,
  totalDebits,
}: SummaryCardProps) {
  const balanceChange = closingBalance - openingBalance;
  const isPositive = balanceChange >= 0;

  return (
    <div className="card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">{accountHolder}</h2>
          <p className="text-[var(--text-muted)] text-sm">
            {formatPeriod(periodFrom, periodTo)}
          </p>
        </div>
        <div className="tag tag-accent">Banco Galicia</div>
      </div>

      {/* Balance comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
            Saldo inicial
          </p>
          <p className="font-mono text-base sm:text-lg truncate">
            {formatArgentineCurrency(openingBalance)}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
            Saldo final
          </p>
          <p className="font-mono text-base sm:text-lg truncate">
            {formatArgentineCurrency(closingBalance)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-subtle)] my-6" />

      {/* Flow summary - stack on mobile, 3 cols on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex justify-between sm:block">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider sm:mb-1">
            Ingresos
          </p>
          <p className="font-mono text-base sm:text-lg text-[var(--positive)]">
            +{formatArgentineCurrency(totalCredits)}
          </p>
        </div>
        <div className="flex justify-between sm:block">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider sm:mb-1">
            Egresos
          </p>
          <p className="font-mono text-base sm:text-lg text-[var(--negative)]">
            -{formatArgentineCurrency(totalDebits)}
          </p>
        </div>
        <div className="flex justify-between sm:block pt-2 sm:pt-0 border-t sm:border-0 border-[var(--border-subtle)]">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider sm:mb-1">
            Balance
          </p>
          <p
            className={`font-mono text-base sm:text-lg font-semibold ${
              isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatArgentineCurrency(balanceChange)}
          </p>
        </div>
      </div>
    </div>
  );
}
