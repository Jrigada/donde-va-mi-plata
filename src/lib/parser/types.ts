export enum TransactionType {
  PURCHASE = "purchase",
  TRANSFER_SENT = "transfer_sent",
  TRANSFER_RECEIVED = "transfer_received",
  CARD_PAYMENT = "card_payment",
  ATM_WITHDRAWAL = "atm_withdrawal",
  TAX = "tax",
  TAX_REVERSAL = "tax_reversal",
  REFUND = "refund",
  CASHBACK = "cashback",
  INTEREST = "interest",
  ECHEQ = "echeq",
  DEBIN = "debin",
  FX_PURCHASE = "fx_purchase",
  CANCELLED = "cancelled",
  UNKNOWN = "unknown",
}

export interface TransactionMetadata {
  cardNumber?: string;
  cuit?: string;
  cbu?: string;
  bank?: string;
  operationRef?: string;
  fxRate?: number;
}

export interface Transaction {
  date: string; // ISO format: "2025-12-01"
  type: TransactionType;
  description: string; // Type of operation (e.g., "COMPRA DEBITO")
  merchant: string; // Merchant/person name
  originCode?: string;
  credit: number | null;
  debit: number | null;
  balance: number;
  rawText: string; // Original multi-line text
  metadata: TransactionMetadata;
  isCancelled?: boolean; // Part of a cancelled pair
  cancelledBy?: number; // Index of the cancelling transaction
}

export interface StatementMetadata {
  bank: string;
  accountType: string;
  accountNumber: string;
  cbu: string;
  accountHolder: string;
  cuit: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
}

export interface TaxConsolidation {
  periodFrom: string;
  periodTo: string;
  description: string;
  amount: number;
}

export interface ParsedStatement {
  metadata: StatementMetadata;
  transactions: Transaction[];
  totals: {
    credits: number;
    debits: number;
    finalBalance: number;
  };
  taxConsolidation: TaxConsolidation[];
}

// Analysis types
export interface CategoryTransaction {
  date: string;
  merchant: string;
  amount: number;
}

export interface CategorySummary {
  name: string;
  color: string;
  total: number;
  percentage: number;
  transactionCount: number;
  transactions: CategoryTransaction[];
}

export interface Subscription {
  name: string;
  amount: number;
  frequency: "monthly" | "unknown";
  isHighAmount: boolean;
  type: "known_service" | "debin" | "recurring_pattern";
}

export interface TaxSummary {
  totalTaxes: number;
  items: {
    description: string;
    amount: number;
  }[];
  creditableAmount: number;
}

export interface TransferSummary {
  name: string;
  cuit?: string;
  bank?: string;
  totalSent: number;
  totalReceived: number;
  net: number;
  transactions: Transaction[];
}

export interface Alert {
  type: "subscription" | "high_tax" | "high_amount" | "credit_card_note";
  severity: "info" | "warning";
  title: string;
  description: string;
}

export interface AnalysisResult {
  period: { from: string; to: string };
  accountHolder: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactions: Transaction[];
  categories: CategorySummary[];
  subscriptions: Subscription[];
  taxes: TaxSummary;
  transfers: TransferSummary[];
  alerts: Alert[];
}

// Validation types
export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  field?: string;
}

export interface ParseResult {
  success: boolean;
  statement?: ParsedStatement;
  bank?: string;
  error?: string;
  validationIssues?: ValidationIssue[];
}
