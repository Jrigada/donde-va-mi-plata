"use client";

import { useState } from "react";
import { AnalysisResult, ValidationIssue } from "@/lib/parser/types";
import { SummaryCard } from "./cards/SummaryCard";
import { AlertsCard } from "./cards/AlertsCard";
import { CategoriesCard } from "./cards/CategoriesCard";
import { SubscriptionsCard } from "./cards/SubscriptionsCard";
import { TaxesCard } from "./cards/TaxesCard";
import { TransfersCard } from "./cards/TransfersCard";
import { ValidationWarnings } from "./ValidationWarnings";

interface AnalysisViewProps {
  analysis: AnalysisResult;
  validationIssues?: ValidationIssue[];
  onReset: () => void;
  backLabel?: string;
}

export function AnalysisView({
  analysis,
  validationIssues = [],
  onReset,
  backLabel = "← Analizar otro",
}: AnalysisViewProps) {
  const [showWarnings, setShowWarnings] = useState(true);
  const totalSpending = analysis.categories.reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Tu resumen</h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base">
            Análisis de tu extracto bancario
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-sm self-start sm:self-auto"
        >
          {backLabel}
        </button>
      </div>

      {/* Validation Warnings */}
      {showWarnings && validationIssues.length > 0 && (
        <ValidationWarnings
          issues={validationIssues}
          onDismiss={() => setShowWarnings(false)}
        />
      )}

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="mb-8">
          <AlertsCard alerts={analysis.alerts} />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary - full width */}
        <div className="lg:col-span-2">
          <SummaryCard
            periodFrom={analysis.period.from}
            periodTo={analysis.period.to}
            accountHolder={analysis.accountHolder}
            openingBalance={analysis.openingBalance}
            closingBalance={analysis.closingBalance}
            totalCredits={analysis.totalCredits}
            totalDebits={analysis.totalDebits}
          />
        </div>

        {/* Categories */}
        <CategoriesCard
          categories={analysis.categories}
          totalSpending={totalSpending}
        />

        {/* Subscriptions */}
        <SubscriptionsCard subscriptions={analysis.subscriptions} />

        {/* Taxes */}
        <TaxesCard taxes={analysis.taxes} />

        {/* Transfers */}
        <TransfersCard transfers={analysis.transfers} />
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] text-center animate-fade-in stagger-6">
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
      </div>
    </div>
  );
}
