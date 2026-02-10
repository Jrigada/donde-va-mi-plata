import {
  ExtractedPDF,
  groupIntoLines,
  lineToString,
  TextItem,
} from "./pdf-extractor";
import { parseArgentineNumber, parseDateDDMMYY } from "./number-format";
import {
  ParsedStatement,
  StatementMetadata,
  Transaction,
  TransactionType,
  TaxConsolidation,
} from "./types";

/**
 * Detects if a PDF is from Banco Galicia
 */
export function isGaliciaPDF(fullText: string): boolean {
  return (
    fullText.includes("Galicia") &&
    (fullText.includes("Resumen de Cuenta Sueldo") ||
      fullText.includes("Caja de Ahorro"))
  );
}

/**
 * Parses a Galicia bank statement PDF
 */
export function parseGaliciaStatement(pdf: ExtractedPDF): ParsedStatement {
  const metadata = extractMetadata(pdf);
  const transactions = extractTransactions(pdf);
  const pdfTotals = extractTotals(pdf);
  const taxConsolidation = extractTaxConsolidation(pdf);

  // Detect and mark cancelled transaction pairs
  markCancelledTransactions(transactions);

  // Calculate totals from parsed transactions (more reliable than PDF extraction)
  // Note: credits are positive, debits are stored as negative values
  const calculatedCredits = transactions.reduce((sum, t) => sum + (t.credit ?? 0), 0);
  const calculatedDebits = transactions.reduce((sum, t) => sum + Math.abs(t.debit ?? 0), 0);

  // Use calculated totals - they're based on the actual parsed transactions
  // which makes the validation check meaningful
  const totals = {
    credits: calculatedCredits,
    debits: calculatedDebits,
    finalBalance: pdfTotals.finalBalance || metadata.closingBalance,
  };

  return {
    metadata,
    transactions,
    totals,
    taxConsolidation,
  };
}

/**
 * Extracts account metadata from the first page
 */
function extractMetadata(pdf: ExtractedPDF): StatementMetadata {
  const firstPage = pdf.pages[0];
  const lines = groupIntoLines(firstPage.items);
  const fullText = pdf.fullText;

  // Extract account holder name - appears after "Consumidor Final" or similar
  let accountHolder = "";
  const holderMatch = fullText.match(
    /Consumidor Final\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?=\s+Resumen)/
  );
  if (holderMatch) {
    accountHolder = holderMatch[1].trim();
  } else {
    // Try alternative: look for name pattern near CUIT
    const altHolderMatch = fullText.match(
      /IVA[:\s]+Consumidor Final\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)/
    );
    if (altHolderMatch) {
      accountHolder = altHolderMatch[1].trim();
    }
  }

  // Extract CUIT
  let cuit = "";
  const cuitMatch = fullText.match(
    /CUIT del Responsable Impositivo\s*:\s*([\d-]+)/
  );
  if (cuitMatch) {
    cuit = cuitMatch[1];
  }

  // Extract account number
  let accountNumber = "";
  const accountMatch = fullText.match(/N°\s*([\d-]+\s+[\d-]+)/);
  if (accountMatch) {
    accountNumber = accountMatch[1].trim();
  }

  // Extract CBU
  let cbu = "";
  const cbuMatch = fullText.match(/CBU\s*(\d{22})/);
  if (cbuMatch) {
    cbu = cbuMatch[1];
  }

  // Extract period dates - look for two dates near "Período de movimientos"
  let periodFrom = "";
  let periodTo = "";
  // Try format: "30/01/2026 26/12/2025 Período de movimientos" (dates may be in reverse order)
  const periodMatch = fullText.match(
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+Período de movimientos/
  );
  if (periodMatch) {
    const date1 = parseDateDDMMYYYY(periodMatch[1]);
    const date2 = parseDateDDMMYYYY(periodMatch[2]);
    // Ensure periodFrom is the earlier date
    if (new Date(date1) < new Date(date2)) {
      periodFrom = date1;
      periodTo = date2;
    } else {
      periodFrom = date2;
      periodTo = date1;
    }
  } else {
    // Try alternative format
    const altPeriodMatch = fullText.match(
      /Período de movimientos\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/
    );
    if (altPeriodMatch) {
      const date1 = parseDateDDMMYYYY(altPeriodMatch[1]);
      const date2 = parseDateDDMMYYYY(altPeriodMatch[2]);
      if (new Date(date1) < new Date(date2)) {
        periodFrom = date1;
        periodTo = date2;
      } else {
        periodFrom = date2;
        periodTo = date1;
      }
    }
  }

  // Extract balances - look for amounts with $ near Saldo labels
  let openingBalance = 0;
  let closingBalance = 0;

  // Format: "$1.235.117,39 $96.908,52 Saldos" (closing first, then opening)
  const balancesMatch = fullText.match(
    /\$?([\d.,]+)\s+\$?([\d.,]+)\s+Saldos/
  );
  if (balancesMatch) {
    // PDF shows closing balance first, opening second
    closingBalance = parseArgentineNumber(balancesMatch[1]);
    openingBalance = parseArgentineNumber(balancesMatch[2]);
  } else {
    // Try to find individual balance labels
    const openingMatch = fullText.match(
      /Saldo inicial\s*\$?([\d.,]+)/i
    );
    if (openingMatch) {
      openingBalance = parseArgentineNumber(openingMatch[1]);
    }

    const closingMatch = fullText.match(
      /Saldo final\s*\$?([\d.,]+)/i
    );
    if (closingMatch) {
      closingBalance = parseArgentineNumber(closingMatch[1]);
    }
  }

  // Determine account type
  let accountType = "Cuenta Sueldo";
  if (fullText.includes("Caja de Ahorro")) {
    accountType = "Caja de Ahorro";
  }

  return {
    bank: "Banco Galicia",
    accountType,
    accountNumber,
    cbu,
    accountHolder,
    cuit,
    periodFrom,
    periodTo,
    openingBalance,
    closingBalance,
  };
}

function parseDateDDMMYYYY(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return dateStr;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Extracts all transactions from the PDF
 */
function extractTransactions(pdf: ExtractedPDF): Transaction[] {
  const transactions: Transaction[] = [];

  for (const page of pdf.pages) {
    const pageTransactions = extractTransactionsFromPage(page.items);
    transactions.push(...pageTransactions);
  }

  return transactions;
}

/**
 * Extracts transactions from a single page
 */
function extractTransactionsFromPage(items: TextItem[]): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = groupIntoLines(items, 3);

  // Find the header row to determine column positions
  let dateColumnX = 0;
  let descColumnX = 100;
  let originColumnX = 300;
  let creditColumnX = 400;
  let debitColumnX = 500;
  let balanceColumnX = 600;

  // Look for header row
  for (const line of lines) {
    const lineText = lineToString(line).toLowerCase();
    if (
      lineText.includes("fecha") &&
      lineText.includes("descripción") &&
      lineText.includes("saldo")
    ) {
      // Found header, extract column positions
      for (const item of line) {
        const text = item.text.toLowerCase();
        if (text.includes("fecha")) dateColumnX = item.x;
        if (text.includes("descripción")) descColumnX = item.x;
        if (text.includes("origen")) originColumnX = item.x;
        if (text.includes("crédito")) creditColumnX = item.x;
        if (text.includes("débito")) debitColumnX = item.x;
        if (text.includes("saldo") && !text.includes("inicial")) balanceColumnX = item.x;
      }
      break;
    }
  }

  // Process lines looking for transactions
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const firstItem = line[0];

    // Check if this line starts with a date (DD/MM/YY)
    if (firstItem && /^\d{2}\/\d{2}\/\d{2}$/.test(firstItem.text)) {
      const transaction = parseTransactionBlock(lines, i, {
        dateColumnX,
        descColumnX,
        originColumnX,
        creditColumnX,
        debitColumnX,
        balanceColumnX,
      });

      if (transaction) {
        transactions.push(transaction.transaction);
        i = transaction.nextIndex;
        continue;
      }
    }

    i++;
  }

  return transactions;
}

interface ColumnPositions {
  dateColumnX: number;
  descColumnX: number;
  originColumnX: number;
  creditColumnX: number;
  debitColumnX: number;
  balanceColumnX: number;
}

interface ParsedTransactionBlock {
  transaction: Transaction;
  nextIndex: number;
}

/**
 * Parses a transaction block (may span multiple lines)
 */
function parseTransactionBlock(
  lines: TextItem[][],
  startIndex: number,
  columns: ColumnPositions
): ParsedTransactionBlock | null {
  const firstLine = lines[startIndex];
  const date = firstLine[0].text;

  // Skip if this is a "Total" line
  const lineText = lineToString(firstLine);
  if (lineText.includes("Total")) {
    return null;
  }

  // Extract values from the first line based on X position
  let description = "";
  let originCode: string | undefined;
  let credit: number | null = null;
  let debit: number | null = null;
  let balance: number = 0;

  // Group items by approximate column
  const rawParts: string[] = [];
  for (const item of firstLine) {
    if (item === firstLine[0]) continue; // Skip date

    // Determine which column this item belongs to based on X position
    if (item.x < columns.originColumnX - 20) {
      // Description column
      description += (description ? " " : "") + item.text;
    } else if (item.x < columns.creditColumnX - 30) {
      // Origin column
      if (/^\d{4}$/.test(item.text)) {
        originCode = item.text;
      } else {
        description += " " + item.text;
      }
    } else if (item.x < columns.debitColumnX - 30) {
      // Credit column
      const parsed = parseArgentineNumber(item.text);
      if (parsed !== 0) {
        credit = parsed;
      }
    } else if (item.x < columns.balanceColumnX - 30) {
      // Debit column
      const parsed = parseArgentineNumber(item.text);
      if (parsed !== 0) {
        debit = parsed;
      }
    } else {
      // Balance column
      const parsed = parseArgentineNumber(item.text);
      if (parsed !== 0) {
        balance = parsed;
      }
    }

    rawParts.push(item.text);
  }

  // Collect additional description lines (multi-line descriptions)
  let nextIndex = startIndex + 1;
  const additionalDescLines: string[] = [];

  while (nextIndex < lines.length) {
    const nextLine = lines[nextIndex];
    const nextFirstItem = nextLine[0];

    // Stop if we hit another date or the total row
    if (nextFirstItem && /^\d{2}\/\d{2}\/\d{2}$/.test(nextFirstItem.text)) {
      break;
    }

    const nextLineText = lineToString(nextLine);
    if (nextLineText.includes("Total") || nextLineText.includes("Consolidado")) {
      break;
    }

    // Check if this is a continuation line (items in description column area)
    const descItems = nextLine.filter(
      (item) => item.x < columns.originColumnX + 50
    );

    if (descItems.length > 0) {
      const descText = descItems.map((item) => item.text).join(" ");
      additionalDescLines.push(descText);
      rawParts.push(descText);

      // Also check for values in other columns on this line
      for (const item of nextLine) {
        if (item.x >= columns.originColumnX - 20 && item.x < columns.creditColumnX - 30) {
          if (/^\d{4}$/.test(item.text)) {
            originCode = item.text;
          }
        } else if (item.x >= columns.creditColumnX - 30 && item.x < columns.debitColumnX - 30) {
          const parsed = parseArgentineNumber(item.text);
          if (parsed !== 0 && credit === null) {
            credit = parsed;
          }
        } else if (item.x >= columns.debitColumnX - 30 && item.x < columns.balanceColumnX - 30) {
          const parsed = parseArgentineNumber(item.text);
          if (parsed !== 0 && debit === null) {
            debit = parsed;
          }
        } else if (item.x >= columns.balanceColumnX - 30) {
          const parsed = parseArgentineNumber(item.text);
          if (parsed !== 0 && balance === 0) {
            balance = parsed;
          }
        }
      }
    }

    nextIndex++;
  }

  // Combine description lines
  const fullDescription = [description, ...additionalDescLines].join("\n");

  // Parse the transaction type and extract merchant info
  const { type, merchant, metadata } = parseTransactionDetails(
    fullDescription,
    credit,
    debit
  );

  const transaction: Transaction = {
    date: parseDateDDMMYY(date),
    type,
    description: description.trim(),
    merchant,
    originCode,
    credit,
    debit,
    balance,
    rawText: fullDescription,
    metadata,
  };

  return { transaction, nextIndex };
}

/**
 * Parses transaction details to determine type and extract merchant info
 */
function parseTransactionDetails(
  fullDescription: string,
  credit: number | null,
  debit: number | null
): {
  type: TransactionType;
  merchant: string;
  metadata: Transaction["metadata"];
} {
  const lines = fullDescription.split("\n").map((l) => l.trim());
  const firstLine = lines[0].toUpperCase();
  let type = TransactionType.UNKNOWN;
  let merchant = "";
  const metadata: Transaction["metadata"] = {};

  // Determine transaction type based on description
  if (firstLine.includes("TRANSFERENCIA A TERCEROS")) {
    type = TransactionType.TRANSFER_SENT;
    // Second line is usually the name
    if (lines.length > 1) {
      merchant = lines[1];
    }
    // Extract CUIT (11 digits)
    const cuitMatch = fullDescription.match(/\b(\d{11})\b/);
    if (cuitMatch) {
      metadata.cuit = cuitMatch[1];
    }
    // Extract bank name (usually last line or contains "BANCO")
    for (const line of lines) {
      if (line.includes("BANCO") || line.includes("MERCADO LIBRE")) {
        metadata.bank = line;
        break;
      }
    }
  } else if (firstLine.includes("TRANSFERENCIA DE TERCEROS")) {
    type = TransactionType.TRANSFER_RECEIVED;
    if (lines.length > 1) {
      merchant = lines[1];
    }
    const cuitMatch = fullDescription.match(/\b(\d{11})\b/);
    if (cuitMatch) {
      metadata.cuit = cuitMatch[1];
    }
    for (const line of lines) {
      if (line.includes("BANCO") || line.includes("MERCADO LIBRE")) {
        metadata.bank = line;
        break;
      }
    }
  } else if (firstLine.includes("COMPRA DEBITO")) {
    type = TransactionType.PURCHASE;
    // Second line is merchant name
    if (lines.length > 1) {
      merchant = lines[1];
    }
    // Third line is usually card number
    const cardMatch = fullDescription.match(/\b(\d{16})\b/);
    if (cardMatch) {
      metadata.cardNumber = cardMatch[1];
    }
  } else if (firstLine.includes("PAGO TARJETA")) {
    type = TransactionType.CARD_PAYMENT;
    merchant = "Pago Tarjeta";
    if (firstLine.includes("VISA")) {
      merchant = "Pago Tarjeta Visa";
    }
  } else if (firstLine.includes("EXTRACCION") || firstLine.includes("EXTRACC")) {
    type = TransactionType.ATM_WITHDRAWAL;
    merchant = "Extracción ATM";
  } else if (firstLine.includes("PERCEPCION RG")) {
    type = TransactionType.TAX;
    merchant = "Percepción RG 5617/24";
  } else if (firstLine.includes("ANULACION PERCEPCION")) {
    type = TransactionType.TAX_REVERSAL;
    merchant = "Anulación Percepción";
  } else if (firstLine.includes("DEV.COMPRA") || firstLine.includes("DEVOLUCION")) {
    type = TransactionType.REFUND;
    merchant = "Devolución";
    const cardMatch = fullDescription.match(/\b(\d{16})\b/);
    if (cardMatch) {
      metadata.cardNumber = cardMatch[1];
    }
  } else if (firstLine.includes("REINTEGRO PROMO")) {
    type = TransactionType.CASHBACK;
    merchant = "Reintegro Promoción Galicia";
  } else if (firstLine.includes("INTERES CAPITALIZADO")) {
    type = TransactionType.INTEREST;
    merchant = "Intereses";
  } else if (firstLine.includes("G.DE ECHEQ") || firstLine.includes("ECHEQ")) {
    type = TransactionType.ECHEQ;
    merchant = "E-Cheque";
  } else if (firstLine.includes("DEBIN")) {
    type = TransactionType.DEBIN;
    if (lines.length > 1) {
      merchant = lines[1];
    } else {
      merchant = "Débito DEBIN";
    }
  } else if (
    firstLine.includes("COMPRA VENTA DE DOLARES") ||
    firstLine.includes("COMPRA MONEDA")
  ) {
    type = TransactionType.FX_PURCHASE;
    merchant = "Compra de Dólares";
    // Extract exchange rate
    const rateMatch = fullDescription.match(/Cotizacion:\s*([\d.,]+)/i);
    if (rateMatch) {
      metadata.fxRate = parseArgentineNumber(rateMatch[1]);
    }
  } else if (firstLine.includes("IMP.") && firstLine.includes("LEY 25413")) {
    type = TransactionType.TAX;
    merchant = "Impuesto al Cheque (Ley 25.413)";
  } else if (firstLine.includes("ANULACION REINTEGRO")) {
    type = TransactionType.REFUND;
    merchant = "Anulación Reintegro";
  }

  // Clean up merchant name
  merchant = merchant.replace(/\s+/g, " ").trim();

  return { type, merchant, metadata };
}

/**
 * Extracts totals from the PDF
 */
function extractTotals(pdf: ExtractedPDF): ParsedStatement["totals"] {
  let credits = 0;
  let debits = 0;
  let finalBalance = 0;

  // Look for the "Total" row in any page
  for (const page of pdf.pages) {
    const lines = groupIntoLines(page.items);

    for (const line of lines) {
      const lineText = lineToString(line);

      if (lineText.includes("Total") && lineText.includes("$")) {
        // Extract values from the total line
        const amounts = lineText.match(
          /\$?\s*([\d.,]+)/g
        );

        if (amounts && amounts.length >= 3) {
          credits = parseArgentineNumber(amounts[0].replace("$", ""));
          debits = parseArgentineNumber(amounts[1].replace("$", ""));
          finalBalance = parseArgentineNumber(amounts[2].replace("$", ""));
        }
      }
    }
  }

  return { credits, debits, finalBalance };
}

/**
 * Extracts tax consolidation information
 */
function extractTaxConsolidation(pdf: ExtractedPDF): TaxConsolidation[] {
  const consolidations: TaxConsolidation[] = [];
  let inConsolidationSection = false;

  for (const page of pdf.pages) {
    const lines = groupIntoLines(page.items);

    for (let i = 0; i < lines.length; i++) {
      const lineText = lineToString(lines[i]);

      if (lineText.includes("Consolidado de retención")) {
        inConsolidationSection = true;
        continue;
      }

      if (inConsolidationSection) {
        // Look for tax entries
        if (lineText.includes("TOTAL") && lineText.includes("LEY 25.413")) {
          // Extract the period
          const periodMatch = lineText.match(
            /PERIODO COMPRENDIDO ENTRE EL ([\d-]+) Y EL ([\d-]+)/i
          );

          // Find the amount (usually on the next line or same line at the end)
          let amount = 0;
          const amountMatch = lineText.match(/([\d.,]+)$/);
          if (amountMatch) {
            amount = parseArgentineNumber(amountMatch[1]);
          } else if (i + 1 < lines.length) {
            const nextLineText = lineToString(lines[i + 1]);
            const nextAmountMatch = nextLineText.match(/^([\d.,]+)/);
            if (nextAmountMatch) {
              amount = parseArgentineNumber(nextAmountMatch[1]);
            }
          }

          if (amount > 0) {
            consolidations.push({
              periodFrom: periodMatch ? periodMatch[1] : "",
              periodTo: periodMatch ? periodMatch[2] : "",
              description: lineText,
              amount,
            });
          }
        }

        // Stop at certain markers
        if (
          lineText.includes("Los depósitos en pesos") ||
          lineText.includes("Canales de atención")
        ) {
          inConsolidationSection = false;
        }
      }
    }
  }

  return consolidations;
}

/**
 * Detects and marks cancelled transaction pairs
 * These are transactions that cancel each other out (e.g., UBER + DEV.COMPRA, PERCEPCION + ANULACION)
 */
function markCancelledTransactions(transactions: Transaction[]): void {
  for (let i = 0; i < transactions.length; i++) {
    const t1 = transactions[i];
    if (t1.isCancelled) continue;

    // Look for cancellation patterns
    for (let j = i + 1; j < transactions.length; j++) {
      const t2 = transactions[j];
      if (t2.isCancelled) continue;

      // Same date, opposite amounts
      if (t1.date !== t2.date) continue;

      const t1Amount = t1.debit ?? t1.credit ?? 0;
      const t2Amount = t2.debit ?? t2.credit ?? 0;

      // Check for exact opposite amounts
      if (Math.abs(t1Amount + t2Amount) < 0.01) {
        // Check for known cancellation patterns
        const isCancellationPair =
          // UBER SHOPPER + DEV.COMPRA pattern
          (t1.merchant.includes("UBER SHOPPER") &&
            t2.type === TransactionType.REFUND) ||
          (t2.merchant.includes("UBER SHOPPER") &&
            t1.type === TransactionType.REFUND) ||
          // PERCEPCION + ANULACION pattern
          (t1.type === TransactionType.TAX &&
            t2.type === TransactionType.TAX_REVERSAL) ||
          (t2.type === TransactionType.TAX &&
            t1.type === TransactionType.TAX_REVERSAL) ||
          // DLOCAL refund pattern
          (t1.merchant.includes("DLOCAL") && t2.type === TransactionType.REFUND) ||
          (t2.merchant.includes("DLOCAL") && t1.type === TransactionType.REFUND);

        if (isCancellationPair) {
          t1.isCancelled = true;
          t1.cancelledBy = j;
          t2.isCancelled = true;
          t2.cancelledBy = i;
          break;
        }
      }
    }
  }
}
