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
