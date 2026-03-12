import { AppLayout } from '@/components/layout/AppLayout';
import { FinanceDashboard } from '@/components/finances/FinanceDashboard';

export default function Finances() {
  return (
    <AppLayout>
      <FinanceDashboard />
    </AppLayout>
  );
}
