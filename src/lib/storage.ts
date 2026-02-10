import { AnalysisResult } from "./parser/types";

const STORAGE_KEY = "bankStatements";
const MAX_STATEMENTS = 12;

export interface StoredStatement {
  id: string;
  periodFrom: string;
  periodTo: string;
  fileName: string;
  analysis: AnalysisResult;
  uploadedAt: string;
}

interface StorageData {
  statements: StoredStatement[];
}

/**
 * Generate a unique ID from the period dates
 */
export function generateStatementId(periodFrom: string, periodTo: string): string {
  // Use the end date's year-month as ID (e.g., "2026-01")
  const date = new Date(periodTo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Load all statements from localStorage
 */
export function loadStatements(): StoredStatement[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: StorageData = JSON.parse(data);
    return parsed.statements || [];
  } catch {
    return [];
  }
}

/**
 * Save a statement to localStorage
 * Returns true if saved, false if duplicate exists (caller should confirm replacement)
 */
export function saveStatement(
  fileName: string,
  analysis: AnalysisResult
): { saved: boolean; existingId?: string } {
  const statements = loadStatements();
  const id = generateStatementId(analysis.period.from, analysis.period.to);

  // Check for duplicate
  const existingIndex = statements.findIndex((s) => s.id === id);
  if (existingIndex !== -1) {
    return { saved: false, existingId: id };
  }

  const newStatement: StoredStatement = {
    id,
    periodFrom: analysis.period.from,
    periodTo: analysis.period.to,
    fileName,
    analysis,
    uploadedAt: new Date().toISOString(),
  };

  statements.push(newStatement);

  // Sort by period (newest first)
  statements.sort((a, b) => b.periodTo.localeCompare(a.periodTo));

  // Enforce limit
  if (statements.length > MAX_STATEMENTS) {
    statements.pop(); // Remove oldest
  }

  persistStatements(statements);
  return { saved: true };
}

/**
 * Replace an existing statement
 */
export function replaceStatement(
  id: string,
  fileName: string,
  analysis: AnalysisResult
): void {
  const statements = loadStatements();
  const index = statements.findIndex((s) => s.id === id);

  if (index !== -1) {
    statements[index] = {
      id,
      periodFrom: analysis.period.from,
      periodTo: analysis.period.to,
      fileName,
      analysis,
      uploadedAt: new Date().toISOString(),
    };
    persistStatements(statements);
  }
}

/**
 * Delete a statement by ID
 */
export function deleteStatement(id: string): void {
  const statements = loadStatements();
  const filtered = statements.filter((s) => s.id !== id);
  persistStatements(filtered);
}

/**
 * Clear all statements
 */
export function clearAllStatements(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get a single statement by ID
 */
export function getStatement(id: string): StoredStatement | null {
  const statements = loadStatements();
  return statements.find((s) => s.id === id) || null;
}

/**
 * Check if we're at the storage limit
 */
export function isAtLimit(): boolean {
  return loadStatements().length >= MAX_STATEMENTS;
}

/**
 * Internal: persist statements to localStorage
 */
function persistStatements(statements: StoredStatement[]): void {
  if (typeof window === "undefined") return;

  const data: StorageData = { statements };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
