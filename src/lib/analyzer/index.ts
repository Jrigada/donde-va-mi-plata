import {
  ParsedStatement,
  Transaction,
  TransactionType,
  AnalysisResult,
  CategorySummary,
  CategoryTransaction,
  Subscription,
  TaxSummary,
  TransferSummary,
  Alert,
} from "../parser/types";
import { categorize, isKnownSubscription, CATEGORIES } from "../merchants/dictionary";

const HIGH_AMOUNT_THRESHOLD = 50000; // Flag subscriptions/DEBINs over this amount

/**
 * Analyzes a parsed bank statement and generates insights
 */
export function analyzeStatement(statement: ParsedStatement): AnalysisResult {
  const { metadata, transactions, totals, taxConsolidation } = statement;

  // Filter out cancelled transactions for most calculations
  const activeTransactions = transactions.filter((t) => !t.isCancelled);

  // Calculate category breakdown
  const categories = calculateCategories(activeTransactions);

  // Detect subscriptions
  const subscriptions = detectSubscriptions(activeTransactions);

  // Summarize taxes
  const taxes = summarizeTaxes(activeTransactions, taxConsolidation);

  // Group transfers
  const transfers = groupTransfers(activeTransactions);

  // Generate alerts
  const alerts = generateAlerts(
    activeTransactions,
    subscriptions,
    taxes,
    categories
  );

  return {
    period: {
      from: metadata.periodFrom,
      to: metadata.periodTo,
    },
    accountHolder: metadata.accountHolder,
    openingBalance: metadata.openingBalance,
    closingBalance: metadata.closingBalance,
    totalCredits: totals.credits,
    totalDebits: Math.abs(totals.debits),
    transactions,
    categories,
    subscriptions,
    taxes,
    transfers,
    alerts,
  };
}

/**
 * Calculates spending by category
 */
function calculateCategories(transactions: Transaction[]): CategorySummary[] {
  const categoryData = new Map<string, {
    total: number;
    count: number;
    color: string;
    transactions: CategoryTransaction[];
  }>();

  // Initialize with "Otros" category (gray color)
  categoryData.set("Otros", { total: 0, count: 0, color: "#9CA3AF", transactions: [] });

  // Only count purchases (debits that are actual spending)
  const spendingTransactions = transactions.filter(
    (t) =>
      t.type === TransactionType.PURCHASE &&
      t.debit !== null &&
      t.debit < 0
  );

  for (const transaction of spendingTransactions) {
    const amount = Math.abs(transaction.debit!);
    const category = categorize(transaction.merchant);

    const categoryTransaction: CategoryTransaction = {
      date: transaction.date,
      merchant: transaction.merchant,
      amount,
    };

    if (category) {
      const existing = categoryData.get(category.name) || {
        total: 0,
        count: 0,
        color: category.color,
        transactions: [],
      };
      categoryData.set(category.name, {
        total: existing.total + amount,
        count: existing.count + 1,
        color: category.color,
        transactions: [...existing.transactions, categoryTransaction],
      });
    } else {
      const otros = categoryData.get("Otros")!;
      categoryData.set("Otros", {
        total: otros.total + amount,
        count: otros.count + 1,
        color: "#9CA3AF",
        transactions: [...otros.transactions, categoryTransaction],
      });
    }
  }

  // Calculate total spending
  const totalSpending = Array.from(categoryData.values()).reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  // Convert to array and calculate percentages
  const categories: CategorySummary[] = Array.from(categoryData.entries())
    .filter(([, data]) => data.total > 0)
    .map(([name, data]) => ({
      name,
      color: data.color,
      total: data.total,
      percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0,
      transactionCount: data.count,
      transactions: data.transactions.sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.total - a.total);

  return categories;
}

/**
 * Detects subscription payments
 */
function detectSubscriptions(transactions: Transaction[]): Subscription[] {
  const subscriptions: Subscription[] = [];
  const seenSubscriptions = new Set<string>();

  for (const transaction of transactions) {
    // Skip non-debit transactions
    if (transaction.debit === null || transaction.debit >= 0) continue;

    const amount = Math.abs(transaction.debit);
    let isSubscription = false;
    let subscriptionType: Subscription["type"] = "known_service";
    let name = transaction.merchant;

    // Check for DEBIN recurrente
    if (transaction.type === TransactionType.DEBIN) {
      isSubscription = true;
      subscriptionType = "debin";
      name = transaction.merchant || "Débito Automático DEBIN";
    }

    // Check for known subscription services
    if (isKnownSubscription(transaction.merchant)) {
      isSubscription = true;
      subscriptionType = "known_service";
    }

    if (isSubscription && !seenSubscriptions.has(name.toUpperCase())) {
      seenSubscriptions.add(name.toUpperCase());
      subscriptions.push({
        name,
        amount,
        frequency: "monthly",
        isHighAmount: amount > HIGH_AMOUNT_THRESHOLD,
        type: subscriptionType,
      });
    }
  }

  // Sort by amount descending
  return subscriptions.sort((a, b) => b.amount - a.amount);
}

/**
 * Summarizes taxes and perceptions
 */
function summarizeTaxes(
  transactions: Transaction[],
  taxConsolidation: ParsedStatement["taxConsolidation"]
): TaxSummary {
  const items: TaxSummary["items"] = [];
  let totalTaxes = 0;
  let creditableAmount = 0;

  // Sum up tax transactions (excluding reversed ones)
  for (const transaction of transactions) {
    if (
      transaction.type === TransactionType.TAX &&
      !transaction.isCancelled &&
      transaction.debit !== null
    ) {
      const amount = Math.abs(transaction.debit);
      totalTaxes += amount;

      // Group by description
      const existingItem = items.find((item) =>
        item.description.includes(transaction.merchant)
      );
      if (existingItem) {
        existingItem.amount += amount;
      } else {
        items.push({
          description: transaction.merchant,
          amount,
        });
      }
    }
  }

  // Extract creditable amount from consolidation
  for (const consolidation of taxConsolidation) {
    if (consolidation.description.includes("CREDITO COMPUTABLE")) {
      creditableAmount = consolidation.amount;
    }
  }

  return {
    totalTaxes,
    items,
    creditableAmount,
  };
}

/**
 * Groups transfers by person
 */
function groupTransfers(transactions: Transaction[]): TransferSummary[] {
  const transferMap = new Map<string, TransferSummary>();

  for (const transaction of transactions) {
    if (
      transaction.type !== TransactionType.TRANSFER_SENT &&
      transaction.type !== TransactionType.TRANSFER_RECEIVED
    ) {
      continue;
    }

    // Use CUIT as key if available, otherwise use normalized name
    const key =
      transaction.metadata.cuit ||
      transaction.merchant.toUpperCase().replace(/\s+/g, " ").trim();

    const existing = transferMap.get(key) || {
      name: transaction.merchant,
      cuit: transaction.metadata.cuit,
      bank: transaction.metadata.bank,
      totalSent: 0,
      totalReceived: 0,
      net: 0,
      transactions: [],
    };

    if (transaction.type === TransactionType.TRANSFER_SENT && transaction.debit) {
      existing.totalSent += Math.abs(transaction.debit);
    } else if (
      transaction.type === TransactionType.TRANSFER_RECEIVED &&
      transaction.credit
    ) {
      existing.totalReceived += transaction.credit;
    }

    existing.net = existing.totalReceived - existing.totalSent;
    existing.transactions.push(transaction);

    // Update name if we have a better one (non-empty)
    if (transaction.merchant && transaction.merchant.length > existing.name.length) {
      existing.name = transaction.merchant;
    }

    transferMap.set(key, existing);
  }

  // Convert to array and sort by absolute net amount
  return Array.from(transferMap.values())
    .filter((t) => t.totalSent > 0 || t.totalReceived > 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/**
 * Generates alerts based on the analysis
 */
function generateAlerts(
  transactions: Transaction[],
  subscriptions: Subscription[],
  taxes: TaxSummary,
  categories: CategorySummary[]
): Alert[] {
  const alerts: Alert[] = [];

  // Alert for high-amount subscriptions
  const highSubscriptions = subscriptions.filter((s) => s.isHighAmount);
  if (highSubscriptions.length > 0) {
    alerts.push({
      type: "subscription",
      severity: "warning",
      title: "Suscripciones de monto alto",
      description: `Tenés ${highSubscriptions.length} suscripción(es) de más de $${HIGH_AMOUNT_THRESHOLD.toLocaleString()}/mes`,
    });
  }

  // Alert for credit card payments
  const cardPayments = transactions.filter(
    (t) => t.type === TransactionType.CARD_PAYMENT
  );
  if (cardPayments.length > 0) {
    const totalCardPayments = cardPayments.reduce(
      (sum, t) => sum + Math.abs(t.debit || 0),
      0
    );
    alerts.push({
      type: "credit_card_note",
      severity: "info",
      title: "Pagos de tarjeta de crédito",
      description: `Pagaste $${totalCardPayments.toLocaleString("es-AR")} en tarjeta. Los gastos detallados de la tarjeta no aparecen en este extracto.`,
    });
  }

  // Alert for high tax burden
  if (taxes.totalTaxes > 30000) {
    alerts.push({
      type: "high_tax",
      severity: "info",
      title: "Impuestos y percepciones",
      description: `Este mes pagaste $${taxes.totalTaxes.toLocaleString("es-AR")} en impuestos bancarios.`,
    });
  }

  // Alert for high spending in a single category
  const topCategory = categories[0];
  if (topCategory && topCategory.percentage > 40) {
    alerts.push({
      type: "high_amount",
      severity: "info",
      title: `${topCategory.name} es tu mayor gasto`,
      description: `Representa el ${topCategory.percentage.toFixed(0)}% de tus compras este período.`,
    });
  }

  return alerts;
}
