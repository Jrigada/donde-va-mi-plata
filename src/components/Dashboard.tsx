"use client";

import { useState } from "react";
import { StoredStatement } from "@/lib/storage";
import { calculateTrends, getDateRangeText } from "@/lib/trends";
import { formatArgentineCurrency } from "@/lib/parser/number-format";
import { StatementCard } from "./cards/StatementCard";

interface DashboardProps {
  statements: StoredStatement[];
  onSelectStatement: (id: string) => void;
  onAddMore: () => void;
  onClearHistory: () => void;
}

export function Dashboard({
  statements,
  onSelectStatement,
  onAddMore,
  onClearHistory,
}: DashboardProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const trends = calculateTrends(statements);
  const dateRange = getDateRangeText(statements);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            Tu historial financiero
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {statements.length} extracto{statements.length > 1 ? "s" : ""} • {dateRange}
          </p>
        </div>
        <button
          onClick={onAddMore}
          className="px-4 py-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] transition-colors text-sm self-start sm:self-auto"
        >
          + Agregar extracto
        </button>
      </div>

      {/* Trends Section */}
      {trends && (
        <div className="mb-8 animate-slide-up">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Tendencias
          </h2>

          {/* Trend Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {trends.categoryTrends.map((trend) => (
              <div
                key={trend.category}
                className="card p-4"
                style={{ borderLeftColor: trend.color, borderLeftWidth: "4px" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: trend.color }}
                  />
                  <span className="text-sm font-medium">{trend.category}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      trend.direction === "up"
                        ? "text-[var(--negative)]"
                        : trend.direction === "down"
                        ? "text-[var(--positive)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {trend.direction === "up" ? "+" : ""}
                    {trend.percentChange.toFixed(0)}%
                  </span>
                  <span
                    className={`text-lg ${
                      trend.direction === "up"
                        ? "text-[var(--negative)]"
                        : trend.direction === "down"
                        ? "text-[var(--positive)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : ""}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  vs {trends.comparisonMeta.previousPeriod}
                </p>
              </div>
            ))}

            {/* Subscription Total Card */}
            <div
              className="card p-4"
              style={{ borderLeftColor: "#8B5CF6", borderLeftWidth: "4px" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#8B5CF6" }}
                />
                <span className="text-sm font-medium">Suscripciones</span>
              </div>
              <div className="text-2xl font-bold font-mono">
                {formatArgentineCurrency(trends.totalSubscriptions)}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                total en {trends.subscriptionMonths} meses
              </p>
            </div>
          </div>

          {/* Monthly Income vs Expenses Chart */}
          {trends.monthlyData.length > 1 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Ingresos vs Egresos</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-[var(--positive)] rounded-sm" />
                    Ingresos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-[var(--negative)] rounded-sm" />
                    Egresos
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-3" style={{ height: "120px" }}>
                {trends.monthlyData.map((month, index) => {
                  const maxAmount = Math.max(
                    ...trends.monthlyData.map((m) => Math.max(m.credits, m.debits))
                  );
                  const creditHeight = maxAmount > 0 ? Math.max((month.credits / maxAmount) * 100, 4) : 4;
                  const debitHeight = maxAmount > 0 ? Math.max((month.debits / maxAmount) * 100, 4) : 4;
                  const isHovered = hoveredMonth === index;
                  const balance = month.credits - month.debits;

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end relative"
                      onMouseEnter={() => setHoveredMonth(index)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 rounded shadow-lg whitespace-nowrap z-10">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Ingresos:</span>
                              <span className="font-mono text-[var(--positive)]">+{formatArgentineCurrency(month.credits)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Egresos:</span>
                              <span className="font-mono text-[var(--negative)]">-{formatArgentineCurrency(month.debits)}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
                              <span className="text-[var(--text-muted)]">Variación:</span>
                              <span className={`font-mono font-semibold ${balance >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                                {balance >= 0 ? "+" : ""}{formatArgentineCurrency(balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Bars container */}
                      <div className="flex items-end gap-1 w-full" style={{ height: "85px" }}>
                        {/* Credits bar (green) */}
                        <div
                          className="flex-1 rounded-t transition-all duration-200 cursor-pointer bg-[var(--positive)]"
                          style={{
                            height: `${creditHeight}%`,
                            opacity: hoveredMonth !== null && !isHovered ? 0.4 : 1,
                            filter: isHovered ? "brightness(1.2)" : "none",
                          }}
                        />
                        {/* Debits bar (red) */}
                        <div
                          className="flex-1 rounded-t transition-all duration-200 cursor-pointer bg-[var(--negative)]"
                          style={{
                            height: `${debitHeight}%`,
                            opacity: hoveredMonth !== null && !isHovered ? 0.4 : 1,
                            filter: isHovered ? "brightness(1.2)" : "none",
                          }}
                        />
                      </div>
                      <span className={`text-xs mt-1 transition-colors ${
                        isHovered ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                      }`}>
                        {month.period}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statements List */}
      <div className="animate-slide-up stagger-1">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Extractos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              onClick={() => onSelectStatement(statement.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] text-center animate-fade-in stagger-2">
        <p className="text-sm text-[var(--text-muted)] mb-4">
          ¿Te sirvió esta herramienta?
        </p>
        <a
          href="https://cafecito.app/jrigada"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:opacity-90 transition-opacity"
        >
          Invitame un cafecito
        </a>
        <div className="mt-8">
          <button
            onClick={onClearHistory}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors"
          >
            Borrar historial y empezar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
