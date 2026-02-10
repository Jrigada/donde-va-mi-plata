"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { AnalysisView } from "@/components/AnalysisView";
import { Dashboard } from "@/components/Dashboard";
import { ContributeSection } from "@/components/ContributeSection";
import { parseBankStatement } from "@/lib/parser";
import { analyzeStatement } from "@/lib/analyzer";
import { AnalysisResult, ValidationIssue } from "@/lib/parser/types";
import {
  loadStatements,
  saveStatement,
  replaceStatement,
  clearAllStatements,
  StoredStatement,
  generateStatementId,
} from "@/lib/storage";

type AppState = "upload" | "loading" | "dashboard" | "detail" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [statements, setStatements] = useState<StoredStatement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [pendingReplacement, setPendingReplacement] = useState<{
    id: string;
    fileName: string;
    analysis: AnalysisResult;
  } | null>(null);

  // Load saved statements on mount
  useEffect(() => {
    const saved = loadStatements();
    if (saved.length > 0) {
      setStatements(saved);
      if (saved.length === 1) {
        // Single statement - go directly to detail view
        setSelectedStatementId(saved[0].id);
        setState("detail");
      } else {
        // Multiple statements - show dashboard
        setState("dashboard");
      }
    }
  }, []);

  const handleFilesSelect = useCallback(async (files: File[]) => {
    setState("loading");
    setError(null);
    setErrorSuggestion(null);
    setValidationIssues([]);

    const newAnalyses: { fileName: string; analysis: AnalysisResult; issues: ValidationIssue[] }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setLoadingProgress(`Procesando ${i + 1} de ${files.length}...`);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const parseResult = await parseBankStatement(arrayBuffer);

        if (!parseResult.success || !parseResult.statement) {
          errors.push(`${file.name}: ${parseResult.error || "Error al procesar"}`);
          continue;
        }

        const analysisResult = analyzeStatement(parseResult.statement);
        newAnalyses.push({
          fileName: file.name,
          analysis: analysisResult,
          issues: parseResult.validationIssues || [],
        });
      } catch (err) {
        console.error("Error processing file:", file.name, err);
        errors.push(`${file.name}: Error desconocido`);
      }
    }

    setLoadingProgress("");

    if (newAnalyses.length === 0) {
      setError(errors.join(". "));
      setState("error");
      return;
    }

    // Save each analysis and check for duplicates
    let currentStatements = loadStatements();
    let pendingReplace: typeof pendingReplacement = null;

    for (const { fileName, analysis, issues } of newAnalyses) {
      const result = saveStatement(fileName, analysis);

      if (!result.saved && result.existingId) {
        // Duplicate detected - for now, just replace (we can add confirmation later)
        // If only one file and it's a duplicate, ask for confirmation
        if (files.length === 1) {
          pendingReplace = { id: result.existingId, fileName, analysis };
          setValidationIssues(issues);
        } else {
          // Multiple files - auto-replace
          replaceStatement(result.existingId, fileName, analysis);
        }
      } else {
        setValidationIssues(issues);
      }
    }

    // Reload statements after saving
    currentStatements = loadStatements();
    setStatements(currentStatements);

    if (pendingReplace) {
      setPendingReplacement(pendingReplace);
      // Show error state with replacement prompt
      setError(`Ya tenés un extracto de este período. ¿Querés reemplazarlo?`);
      setState("error");
      return;
    }

    if (errors.length > 0 && newAnalyses.length > 0) {
      // Partial success - continue but show warning
      console.warn("Some files failed:", errors);
    }

    // Determine which view to show
    if (currentStatements.length === 1) {
      setSelectedStatementId(currentStatements[0].id);
      setState("detail");
    } else {
      setState("dashboard");
    }
  }, []);

  const handleReplaceConfirm = useCallback(() => {
    if (pendingReplacement) {
      replaceStatement(
        pendingReplacement.id,
        pendingReplacement.fileName,
        pendingReplacement.analysis
      );
      const updated = loadStatements();
      setStatements(updated);
      setPendingReplacement(null);
      setError(null);

      if (updated.length === 1) {
        setSelectedStatementId(updated[0].id);
        setState("detail");
      } else {
        setState("dashboard");
      }
    }
  }, [pendingReplacement]);

  const handleReset = useCallback(() => {
    setState("upload");
    setSelectedStatementId(null);
    setError(null);
    setErrorSuggestion(null);
    setValidationIssues([]);
    setPendingReplacement(null);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    if (statements.length > 1) {
      setSelectedStatementId(null);
      setState("dashboard");
    } else {
      handleReset();
    }
  }, [statements.length, handleReset]);

  const handleSelectStatement = useCallback((id: string) => {
    setSelectedStatementId(id);
    setState("detail");
  }, []);

  const handleAddMore = useCallback(() => {
    setState("upload");
  }, []);

  const handleClearHistory = useCallback(() => {
    if (window.confirm("¿Seguro que querés borrar todo el historial? Esta acción no se puede deshacer.")) {
      clearAllStatements();
      setStatements([]);
      setSelectedStatementId(null);
      setState("upload");
    }
  }, []);

  // Get selected statement data
  const selectedStatement = selectedStatementId
    ? statements.find((s) => s.id === selectedStatementId)
    : null;

  return (
    <main className="min-h-screen">
      {/* Upload state */}
      {(state === "upload" || state === "loading" || state === "error") && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
          {/* Logo / Title */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              ¿Dónde va mi{" "}
              <span className="text-[var(--accent)]">plata</span>?
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
              Subí tu extracto de cuenta de Banco Galicia y descubrí en qué gastás.
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Caja de ahorro o cuenta corriente (tarjeta de crédito próximamente)
            </p>
          </div>

          {/* Upload zone */}
          <div className="w-full animate-fade-in stagger-1">
            <FileUpload
              onFilesSelect={handleFilesSelect}
              isLoading={state === "loading"}
              loadingProgress={loadingProgress}
            />
          </div>

          {/* Back to dashboard link if we have statements */}
          {statements.length > 0 && state !== "loading" && (
            <button
              onClick={handleBackToDashboard}
              className="mt-6 text-sm text-[var(--accent)] hover:underline"
            >
              ← Volver a mi historial ({statements.length} extracto{statements.length > 1 ? "s" : ""})
            </button>
          )}

          {/* Error state */}
          {state === "error" && error && (
            <div className="mt-6 max-w-md mx-auto p-4 border-l-4 border-[var(--negative)] bg-[var(--bg-secondary)] animate-fade-in">
              <p className="text-xs uppercase tracking-wider text-[var(--negative)] mb-2">
                {pendingReplacement ? "Extracto duplicado" : "Error"}
              </p>
              <p className="text-[var(--text-primary)] mb-2">{error}</p>
              {errorSuggestion && (
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  {errorSuggestion}
                </p>
              )}
              <div className="flex gap-3">
                {pendingReplacement ? (
                  <>
                    <button
                      onClick={handleReplaceConfirm}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Sí, reemplazar
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReset}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                  >
                    Intentar de nuevo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Supported banks */}
          <div className="mt-12 text-center animate-fade-in stagger-2">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Bancos soportados
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="tag">Banco Galicia</span>
              <span className="tag text-[var(--text-muted)]">Más próximamente</span>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-16 max-w-2xl mx-auto animate-fade-in stagger-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center border border-[var(--border)] text-[var(--accent)] font-mono font-bold">
                  1
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Subí tu extracto PDF del homebanking
                </p>
              </div>
              <div>
                <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center border border-[var(--border)] text-[var(--accent)] font-mono font-bold">
                  2
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Lo procesamos en tu navegador (no sale de tu compu)
                </p>
              </div>
              <div>
                <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center border border-[var(--border)] text-[var(--accent)] font-mono font-bold">
                  3
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Ves un resumen con categorías, suscripciones e impuestos
                </p>
              </div>
            </div>
          </div>

          {/* Privacy/Transparency Section */}
          <details className="mt-16 max-w-2xl mx-auto animate-fade-in stagger-4 group">
            <summary className="cursor-pointer text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors list-none">
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                ¿Cómo sé que mis datos están seguros? (click para ver)
              </span>
            </summary>
            <div className="mt-6 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] text-left space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Sin servidor, sin base de datos</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Esta es una página 100% estática. No hay backend, no hay API, no hay base de datos. Tu PDF se procesa únicamente con JavaScript en tu navegador.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Verificalo vos mismo</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Abrí las DevTools del navegador (F12), andá a la pestaña "Network" y subí un archivo. Vas a ver que no se envía ningún request con tus datos.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Código abierto</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Todo el código está disponible en{" "}
                  <a
                    href="https://github.com/Jrigada/donde-va-mi-plata"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    GitHub
                  </a>
                  . Podés auditarlo, forkearlo, o correrlo localmente si preferís.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Headers de seguridad</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  La página tiene Content-Security-Policy configurado para bloquear cualquier envío de datos a servidores externos. Es técnicamente imposible que filtremos tu información.
                </p>
              </div>
            </div>
          </details>

          {/* Contribute Section */}
          <ContributeSection />
        </div>
      )}

      {/* Dashboard state */}
      {state === "dashboard" && statements.length > 1 && (
        <div className="px-4 sm:px-6 py-8 sm:py-12">
          <Dashboard
            statements={statements}
            onSelectStatement={handleSelectStatement}
            onAddMore={handleAddMore}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}

      {/* Detail state */}
      {state === "detail" && selectedStatement && (
        <div className="px-4 sm:px-6 py-8 sm:py-12">
          <AnalysisView
            analysis={selectedStatement.analysis}
            validationIssues={validationIssues}
            onReset={handleBackToDashboard}
            backLabel={statements.length > 1 ? "← Volver al historial" : "← Analizar otro"}
          />
        </div>
      )}
    </main>
  );
}
