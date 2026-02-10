/**
 * Obfuscation utilities for anonymizing bank statement data
 * All processing happens client-side - no data leaves the browser
 */

// Random seed for consistent obfuscation within a session
const randomFactor = 0.5 + Math.random() * 1.5; // Between 0.5 and 2
const dateShift = Math.floor(Math.random() * 60) - 30; // Shift -30 to +30 days

/**
 * Obfuscate a monetary amount while keeping similar magnitude
 */
function obfuscateAmount(amount: string): string {
  // Match Argentine number format: 1.234.567,89
  const match = amount.match(/[\d.,]+/);
  if (!match) return amount;

  // Parse the number
  const numStr = match[0];
  const normalized = numStr.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);

  if (isNaN(num)) return amount;

  // Apply random factor
  const obfuscated = num * randomFactor;

  // Format back to Argentine style
  const formatted = obfuscated.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return amount.replace(match[0], formatted);
}

/**
 * Obfuscate a date by shifting it
 */
function obfuscateDate(dateStr: string): string {
  // Match common date formats: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!match) return dateStr;

  const [full, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;

  const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
  date.setDate(date.getDate() + dateShift);

  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = year.length === 2
    ? String(date.getFullYear()).slice(-2)
    : String(date.getFullYear());

  const separator = full.includes("/") ? "/" : "-";
  return dateStr.replace(full, `${newDay}${separator}${newMonth}${separator}${newYear}`);
}

/**
 * Generate a fake CBU (22 digits)
 */
function generateFakeCBU(): string {
  let cbu = "";
  for (let i = 0; i < 22; i++) {
    cbu += Math.floor(Math.random() * 10);
  }
  return cbu;
}

/**
 * Generate a fake CUIT/CUIL (11 digits with format XX-XXXXXXXX-X)
 */
function generateFakeCUIT(): string {
  const prefix = ["20", "23", "24", "27", "30", "33", "34"][Math.floor(Math.random() * 7)];
  let middle = "";
  for (let i = 0; i < 8; i++) {
    middle += Math.floor(Math.random() * 10);
  }
  const suffix = Math.floor(Math.random() * 10);
  return `${prefix}-${middle}-${suffix}`;
}

/**
 * Generate a fake account number
 */
function generateFakeAccountNumber(): string {
  let acc = "";
  for (let i = 0; i < 10; i++) {
    acc += Math.floor(Math.random() * 10);
  }
  return acc;
}

// Common Argentine first and last names for replacement
const fakeFirstNames = ["JUAN", "MARIA", "CARLOS", "ANA", "JOSE", "LAURA", "PEDRO", "LUCIA"];
const fakeLastNames = ["GARCIA", "RODRIGUEZ", "MARTINEZ", "LOPEZ", "GONZALEZ", "PEREZ", "SANCHEZ"];

function getRandomName(): string {
  const first = fakeFirstNames[Math.floor(Math.random() * fakeFirstNames.length)];
  const last = fakeLastNames[Math.floor(Math.random() * fakeLastNames.length)];
  return `${first} ${last}`;
}

/**
 * Main obfuscation function for raw PDF text
 */
export function obfuscateText(text: string): string {
  let result = text;

  // Replace CBUs (22 consecutive digits)
  result = result.replace(/\b\d{22}\b/g, generateFakeCBU());

  // Replace CUITs/CUILs (XX-XXXXXXXX-X format)
  result = result.replace(/\b(20|23|24|27|30|33|34)-?\d{8}-?\d\b/g, generateFakeCUIT());

  // Replace DNIs (7-8 digits, possibly with dots)
  result = result.replace(/\b\d{2}\.?\d{3}\.?\d{3}\b/g, () => {
    const num = 10000000 + Math.floor(Math.random() * 40000000);
    return num.toLocaleString("es-AR").replace(/,/g, ".");
  });

  // Replace account numbers (sequences of 8-14 digits that aren't dates or amounts)
  result = result.replace(/(?<!\d[\/\-])\b\d{8,14}\b(?![\/\-]\d)/g, generateFakeAccountNumber());

  // Replace common name patterns (APELLIDO NOMBRE or NOMBRE APELLIDO in caps)
  // This is tricky - we'll replace strings that look like names in transfer descriptions
  result = result.replace(/(?:TRANSFERENCIA\s+(?:A|DE|DESDE|PARA)\s+)([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/gi,
    (match, name) => match.replace(name, getRandomName())
  );

  // Replace email addresses
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "usuario@ejemplo.com");

  // Replace phone numbers (various formats)
  result = result.replace(/(?:\+54\s?)?(?:11|15)?\s?\d{4}[\s-]?\d{4}/g, "11 5555-5555");

  // Obfuscate amounts (numbers with decimal comma, possibly with thousands dots)
  result = result.replace(/\$?\s*[\d.]+,\d{2}/g, obfuscateAmount);

  // Obfuscate dates
  result = result.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, obfuscateDate);

  // Replace any remaining sequences that look like personal identifiers
  // Account holder names at the start of statements
  result = result.replace(/(?:TITULAR|CLIENTE|NOMBRE)[:\s]+([A-Z][a-záéíóú]+\s+[A-Z][a-záéíóú]+(?:\s+[A-Z][a-záéíóú]+)?)/gi,
    (match, name) => match.replace(name, getRandomName())
  );

  return result;
}

/**
 * Create a downloadable obfuscated file
 */
export function createObfuscatedDownload(originalText: string, bankName: string): void {
  const obfuscated = obfuscateText(originalText);

  const header = `=== TEMPLATE DE EXTRACTO BANCARIO OFUSCADO ===
Banco detectado: ${bankName || "No identificado"}
Fecha de generación: ${new Date().toISOString().split("T")[0]}

NOTA: Este archivo ha sido procesado localmente en tu navegador.
Todos los datos personales han sido reemplazados por valores ficticios.
La estructura del documento se mantiene intacta para análisis.

Por favor enviá este archivo a: juanrigada97@gmail.com
==============================================

`;

  const content = header + obfuscated;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${bankName || "banco"}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extract raw text from PDF for obfuscation
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += `\n--- Página ${i} ---\n${pageText}\n`;
  }

  return fullText;
}
