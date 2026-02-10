import { ParsedStatement, ValidationIssue } from "./types";

/**
 * Validates a parsed statement and returns any issues found.
 * Errors are blocking (can't show results), warnings are informational.
 */
export function validateStatement(
  statement: ParsedStatement | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Fatal: No statement at all
  if (!statement) {
    issues.push({
      code: "PARSE_FAILED",
      severity: "error",
      message: "No pudimos leer el contenido del PDF",
      suggestion: "Verificá que sea un extracto de cuenta descargado del homebanking",
    });
    return issues;
  }

  // Fatal: No transactions
  if (statement.transactions.length === 0) {
    issues.push({
      code: "NO_TRANSACTIONS",
      severity: "error",
      message: "No encontramos movimientos en este extracto",
      suggestion:
        "¿Es un resumen de tarjeta de crédito? Por ahora solo soportamos extractos de cuenta",
    });
  }

  // Warning: Missing period dates
  if (!statement.metadata.periodFrom || !statement.metadata.periodTo) {
    issues.push({
      code: "MISSING_PERIOD",
      severity: "warning",
      message: "No pudimos detectar el período del extracto",
      field: "period",
    });
  }

  // Warning: Missing account holder
  if (!statement.metadata.accountHolder?.trim()) {
    issues.push({
      code: "MISSING_ACCOUNT_HOLDER",
      severity: "warning",
      message: "No encontramos el nombre del titular",
      field: "accountHolder",
    });
  }

  // Warning: Zero balances (suspicious if both are zero)
  if (
    statement.metadata.openingBalance === 0 &&
    statement.metadata.closingBalance === 0
  ) {
    issues.push({
      code: "MISSING_BALANCE",
      severity: "warning",
      message: "No pudimos extraer los saldos de la cuenta",
      field: "balance",
    });
  }

  // Warning: Balance mismatch
  const calculatedBalance =
    statement.metadata.openingBalance +
    statement.totals.credits -
    statement.totals.debits;
  const diff = Math.abs(calculatedBalance - statement.metadata.closingBalance);
  // Allow small rounding differences (up to $1)
  if (diff > 1 && statement.metadata.closingBalance !== 0) {
    // Provide a clearer message about what this means
    const diffFormatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(diff);

    issues.push({
      code: "BALANCE_MISMATCH",
      severity: "warning",
      message: `Diferencia de ${diffFormatted} entre el saldo calculado y el del extracto`,
      suggestion: "Esto puede deberse a movimientos en otras monedas o comisiones no detalladas",
    });
  }

  // Warning: Transactions with zero amounts
  const zeroAmountCount = statement.transactions.filter(
    (t) => t.credit === 0 || t.debit === 0
  ).length;
  // Only warn if transactions have explicit zero (not null)
  const suspiciousZeros = statement.transactions.filter(
    (t) =>
      (t.credit === 0 && t.debit === null) ||
      (t.debit === 0 && t.credit === null)
  ).length;
  if (suspiciousZeros > 0) {
    issues.push({
      code: "ZERO_AMOUNTS",
      severity: "warning",
      message: `${suspiciousZeros} movimiento(s) tienen monto $0`,
      suggestion: "Algunos montos no se pudieron leer correctamente",
    });
  }

  return issues;
}

/**
 * Check if any issues are blocking errors
 */
export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

/**
 * Get only warning-level issues
 */
export function getWarnings(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === "warning");
}
