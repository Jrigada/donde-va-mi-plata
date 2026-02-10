"use client";

import { useState } from "react";
import { CategorySummary } from "@/lib/parser/types";
import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface CategoriesCardProps {
  categories: CategorySummary[];
  totalSpending: number;
}

const INITIAL_VISIBLE = 10;

export function CategoriesCard({ categories, totalSpending }: CategoriesCardProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllTransactions, setShowAllTransactions] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleShowAll = (name: string) => {
    setShowAllTransactions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (categories.length === 0) {
    return (
      <div className="card p-6 animate-slide-up stagger-2">
        <h3 className="text-lg font-semibold mb-4">Categorías de gasto</h3>
        <p className="text-[var(--text-muted)]">No hay compras en este período</p>
      </div>
    );
  }

  return (
    <div className="card p-6 animate-slide-up stagger-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Categorías de gasto</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Total: <span className="font-mono text-[var(--text-primary)]">{formatArgentineCurrency(totalSpending)}</span>
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => {
          const isExpanded = expandedCategories.has(category.name);
          return (
            <div key={category.name}>
              {/* Category row - clickable */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span
                      className={`transition-transform duration-200 text-[var(--text-muted)] text-xs ${isExpanded ? "rotate-90" : ""}`}
                    >
                      ▶
                    </span>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                      {category.name}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm shrink-0">
                      ({category.transactionCount})
                    </span>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1 sm:gap-2">
                    <span className="font-mono font-medium text-sm sm:text-base">
                      {formatArgentineCurrency(category.total)}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm">
                      {category.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar h-2 ml-5">
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: category.color,
                      transitionDelay: `${index * 50}ms`,
                    }}
                  />
                </div>
              </button>

              {/* Expanded transaction list */}
              {isExpanded && category.transactions.length > 0 && (
                <div className="mt-3 ml-5 pl-4 border-l-2 border-[var(--border-subtle)] space-y-2 animate-fade-in">
                  {(() => {
                    const showAll = showAllTransactions.has(category.name);
                    const visibleTransactions = showAll
                      ? category.transactions
                      : category.transactions.slice(0, INITIAL_VISIBLE);
                    const remainingCount = category.transactions.length - INITIAL_VISIBLE;

                    return (
                      <>
                        {visibleTransactions.map((tx, txIndex) => (
                          <div
                            key={`${tx.merchant}-${txIndex}`}
                            className="flex items-center justify-between gap-3 py-1 text-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[var(--text-muted)] text-xs shrink-0">
                                {new Date(tx.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                              </span>
                              <span className="truncate text-[var(--text-secondary)]">
                                {tx.merchant}
                              </span>
                            </div>
                            <span className="font-mono text-xs shrink-0">
                              {formatArgentineCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                        {remainingCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleShowAll(category.name);
                            }}
                            className="text-xs text-[var(--accent)] hover:underline pt-1 cursor-pointer"
                          >
                            {showAll ? "Ver menos" : `Ver ${remainingCount} más`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
