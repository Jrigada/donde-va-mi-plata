export * from "./types";
export * from "./number-format";
export * from "./pdf-extractor";
export * from "./galicia-parser";
export * from "./validation";

import { extractPDFContent } from "./pdf-extractor";
import { isGaliciaPDF, parseGaliciaStatement } from "./galicia-parser";
import { ParseResult } from "./types";
import { validateStatement, hasBlockingErrors } from "./validation";

/**
 * Main entry point for parsing bank statements
 * Detects the bank and uses the appropriate parser
 */
export async function parseBankStatement(
  file: ArrayBuffer
): Promise<ParseResult> {
  try {
    const pdf = await extractPDFContent(file);

    // Check if we got any text at all
    if (!pdf.fullText.trim()) {
      return {
        success: false,
        error: "No pudimos extraer texto del PDF",
        validationIssues: [
          {
            code: "INVALID_PDF",
            severity: "error",
            message: "El archivo no contiene texto legible",
            suggestion: "Verificá que no sea una imagen escaneada",
          },
        ],
      };
    }

    // Detect bank and parse
    if (isGaliciaPDF(pdf.fullText)) {
      const statement = parseGaliciaStatement(pdf);
      const issues = validateStatement(statement);
      const hasErrors = hasBlockingErrors(issues);

      if (hasErrors) {
        return {
          success: false,
          statement: undefined,
          bank: "Banco Galicia",
          error: issues.find((i) => i.severity === "error")?.message,
          validationIssues: issues,
        };
      }

      return {
        success: true,
        statement,
        bank: "Banco Galicia",
        validationIssues: issues,
      };
    }

    // Unknown bank
    return {
      success: false,
      error:
        "No pudimos reconocer el formato de este extracto. Por ahora solo soportamos Banco Galicia.",
      bank: "unknown",
      validationIssues: [
        {
          code: "UNSUPPORTED_BANK",
          severity: "error",
          message: "Este extracto no es de Banco Galicia",
          suggestion:
            "Por ahora solo soportamos extractos de cuenta de Galicia",
        },
      ],
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al procesar el PDF",
      validationIssues: [
        {
          code: "UNEXPECTED_ERROR",
          severity: "error",
          message:
            error instanceof Error
              ? error.message
              : "Error inesperado al procesar el archivo",
        },
      ],
    };
  }
}
