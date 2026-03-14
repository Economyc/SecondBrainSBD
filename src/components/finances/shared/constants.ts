import { UtensilsCrossed, Car, Home, Zap, Clapperboard, ShoppingBag, HeartPulse, GraduationCap, Plane, CreditCard, Briefcase, Megaphone, Monitor, HelpCircle, Banknote, HandCoins, PiggyBank, Receipt, Users, Building } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Food & Dining': UtensilsCrossed, 'Transportation': Car, 'Housing': Home, 'Utilities': Zap,
  'Entertainment': Clapperboard, 'Shopping': ShoppingBag, 'Healthcare': HeartPulse, 'Education': GraduationCap,
  'Travel': Plane, 'Subscriptions': CreditCard, 'Office': Briefcase, 'Marketing': Megaphone,
  'Software': Monitor, 'Salary': Banknote, 'Freelance': HandCoins, 'Investment': PiggyBank,
  'Sales': Receipt, 'Consulting': Users, 'Rental': Building, 'Refund': Receipt, 'Other': HelpCircle,
};

export const COP = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export const PIE_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
  'hsl(var(--accent))', 'hsl(var(--muted-foreground))',
];
