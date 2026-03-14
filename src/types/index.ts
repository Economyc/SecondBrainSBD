export type Environment = 'personal' | 'work';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  subtasks: Subtask[];
  attachedDocumentIds: string[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DocFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface DocFile {
  id: string;
  name: string;
  folderId: string | null;
  type: string;
  size: number;
  downloadUrl: string; // Firebase Storage public URL
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'paid';
export type RecurrenceFrequency = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'PayPal',
  'Crypto',
  'Check',
  'Other',
] as const;

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
  paymentMethod?: string;
  status?: PaymentStatus;
  recurrence?: RecurrenceFrequency;
  recurrenceEndDate?: string;
  recurringParentId?: string; // links generated entries to template
  lastGeneratedDate?: string; // tracks last auto-generated date (on template only)
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Travel',
  'Subscriptions',
  'Office',
  'Marketing',
  'Salary',
  'Software',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Sales',
  'Consulting',
  'Rental',
  'Refund',
  'Other',
] as const;

export interface NotePage {
  id: string;
  title: string;
  content: string; // TipTap JSON string
  folderId?: string | null; // document folder reference
  createdAt: string;
  updatedAt: string;
}

export type ContactCategory = 'personal' | 'corporate' | 'provider' | 'client' | 'other';

export const CONTACT_CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'client', label: 'Cliente' },
  { value: 'other', label: 'Otro' },
];

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  category: ContactCategory;
  address?: string;
  notes?: string;
  tags: string[];
  website?: string;
  socialLinks?: { linkedin?: string; twitter?: string; instagram?: string };
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Budgets ──

export type BudgetPeriod = 'monthly' | 'yearly';

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  month?: string;   // 'yyyy-MM' for monthly
  year?: number;     // for yearly
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Investments ──

export type InvestmentType = 'stocks' | 'crypto' | 'funds' | 'real_estate' | 'bonds' | 'savings' | 'other';

export interface InvestmentEntry {
  id: string;
  date: string;
  type: 'buy' | 'sell' | 'dividend' | 'valuation';
  units?: number;
  pricePerUnit?: number;
  totalAmount: number;
  notes?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
  entries: InvestmentEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'stocks', label: 'Acciones' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'funds', label: 'Fondos' },
  { value: 'real_estate', label: 'Inmuebles' },
  { value: 'bonds', label: 'Bonos' },
  { value: 'savings', label: 'CDT / Ahorro' },
  { value: 'other', label: 'Otro' },
];

// ── Credits / Loans ──

export type CreditType = 'mortgage' | 'car' | 'personal' | 'credit_card' | 'student' | 'business' | 'other';
export type CreditStatus = 'active' | 'paid_off';

export interface CreditPayment {
  id: string;
  date: string;
  amount: number;
  principal: number;
  interest: number;
  notes?: string;
}

export interface Credit {
  id: string;
  name: string;
  type: CreditType;
  status: CreditStatus;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  endDate?: string;
  payments: CreditPayment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const CREDIT_TYPES: { value: CreditType; label: string }[] = [
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'car', label: 'Vehículo' },
  { value: 'personal', label: 'Personal' },
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'student', label: 'Estudiantil' },
  { value: 'business', label: 'Empresarial' },
  { value: 'other', label: 'Otro' },
];

// ── Albert (AI Agent) ──

export type AIProvider = 'groq' | 'gemini';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: AIProvider;
  toolCalls?: ToolCallRecord[];
  createdAt: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
}
