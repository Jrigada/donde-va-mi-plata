/**
 * Converts Argentine number format to standard JavaScript number
 * Argentine format: 1.000.000,50 (dots for thousands, comma for decimal)
 * Standard format: 1000000.50
 *
 * Examples:
 * "5.183,00" -> 5183.00
 * "-502.685,77" -> -502685.77
 * "1.000.000,50" -> 1000000.50
 * "31,52" -> 31.52
 * "5.000.000,00" -> 5000000.00
 */
export function parseArgentineNumber(value: string): number {
  if (!value || value.trim() === "") {
    return 0;
  }

  // Remove any whitespace
  let cleaned = value.trim();

  // Handle negative sign
  const isNegative = cleaned.startsWith("-");
  if (isNegative) {
    cleaned = cleaned.substring(1);
  }

  // Remove dots (thousand separators)
  cleaned = cleaned.replace(/\./g, "");

  // Replace comma with dot (decimal separator)
  cleaned = cleaned.replace(",", ".");

  // Parse as float
  const result = parseFloat(cleaned);

  if (isNaN(result)) {
    return 0;
  }

  return isNegative ? -result : result;
}

/**
 * Formats a number back to Argentine format for display
 * Standard format: 1000000.50
 * Argentine format: 1.000.000,50
 */
export function formatArgentineNumber(value: number): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Split into integer and decimal parts
  const parts = absValue.toFixed(2).split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add thousand separators (dots)
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Combine with comma for decimal
  const formatted = `${withThousands},${decimalPart}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats a number as Argentine currency (with $ sign)
 */
export function formatArgentineCurrency(value: number): string {
  const formatted = formatArgentineNumber(value);
  return value < 0 ? `-$${formatted.substring(1)}` : `$${formatted}`;
}

/**
 * Parses a date from DD/MM/YY format to ISO format YYYY-MM-DD
 */
export function parseDateDDMMYY(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) {
    return dateStr; // Return as-is if doesn't match expected format
  }

  const [, day, month, year] = match;
  // Assume 20xx for years
  const fullYear = `20${year}`;

  return `${fullYear}-${month}-${day}`;
}

/**
 * Formats an ISO date to Argentine display format
 */
export function formatDateArgentine(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
