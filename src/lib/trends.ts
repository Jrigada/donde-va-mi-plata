import { StoredStatement } from "./storage";
import { CategorySummary } from "./parser/types";

export interface TrendItem {
  category: string;
  color: string;
  currentAmount: number;
  previousAmount: number;
  percentChange: number;
  direction: "up" | "down" | "same";
}

export interface TrendsSummaryMeta {
  currentPeriod: string;
  previousPeriod: string;
}

export interface MonthlyData {
  period: string;
  credits: number;
  debits: number;
}

export interface TrendsSummary {
  categoryTrends: TrendItem[];
  totalSubscriptions: number;
  subscriptionMonths: number;
  monthlyData: MonthlyData[];
  comparisonMeta: TrendsSummaryMeta;
}

/**
 * Calculate trends from multiple statements
 * Statements should be sorted newest first
 */
export function calculateTrends(statements: StoredStatement[]): TrendsSummary | null {
  if (statements.length < 2) {
    return null;
  }

  // Statements are sorted newest first
  const current = statements[0];
  const previous = statements[1];

  // Calculate category trends (compare current vs previous month)
  const categoryTrends = calculateCategoryTrends(
    current.analysis.categories,
    previous.analysis.categories
  );

  // Calculate total subscription spending across all months
  let totalSubscriptions = 0;
  for (const statement of statements) {
    for (const sub of statement.analysis.subscriptions) {
      totalSubscriptions += sub.amount;
    }
  }

  // Monthly data for chart (credits and debits)
  const monthlyData: MonthlyData[] = statements
    .slice()
    .reverse() // Oldest first for chart
    .map((s) => ({
      period: formatPeriodShort(s.periodTo),
      credits: s.analysis.totalCredits,
      debits: s.analysis.totalDebits,
    }));

  // Comparison metadata - which months are we comparing
  const comparisonMeta: TrendsSummaryMeta = {
    currentPeriod: formatPeriodShort(current.periodTo),
    previousPeriod: formatPeriodShort(previous.periodTo),
  };

  return {
    categoryTrends,
    totalSubscriptions,
    subscriptionMonths: statements.length,
    monthlyData,
    comparisonMeta,
  };
}

function calculateCategoryTrends(
  current: CategorySummary[],
  previous: CategorySummary[]
): TrendItem[] {
  const trends: TrendItem[] = [];
  const previousMap = new Map(previous.map((c) => [c.name, c]));

  for (const category of current) {
    const prev = previousMap.get(category.name);
    const previousAmount = prev?.total ?? 0;
    const currentAmount = category.total;

    // Skip if both are zero
    if (currentAmount === 0 && previousAmount === 0) continue;

    let percentChange = 0;
    let direction: TrendItem["direction"] = "same";

    if (previousAmount === 0 && currentAmount > 0) {
      percentChange = 100; // New category
      direction = "up";
    } else if (previousAmount > 0) {
      percentChange = ((currentAmount - previousAmount) / previousAmount) * 100;
      if (percentChange > 5) direction = "up";
      else if (percentChange < -5) direction = "down";
    }

    trends.push({
      category: category.name,
      color: category.color,
      currentAmount,
      previousAmount,
      percentChange,
      direction,
    });
  }

  // Sort by absolute percent change (most significant first)
  trends.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

  // Return top 3 most significant changes
  return trends.slice(0, 3);
}

function formatPeriodShort(periodTo: string): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const [year, month] = periodTo.split("-").map(Number);
  return `${months[month - 1]}`;
}

/**
 * Get the date range text for multiple statements
 */
export function getDateRangeText(statements: StoredStatement[]): string {
  if (statements.length === 0) return "";

  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  // Statements are sorted newest first, so last is oldest
  const oldest = statements[statements.length - 1];
  const newest = statements[0];

  const [oldYear, oldMonth] = oldest.periodTo.split("-").map(Number);
  const [newYear, newMonth] = newest.periodTo.split("-").map(Number);

  const oldStr = `${months[oldMonth - 1]} ${oldYear}`;
  const newStr = `${months[newMonth - 1]} ${newYear}`;

  return `${oldStr} - ${newStr}`;
}
