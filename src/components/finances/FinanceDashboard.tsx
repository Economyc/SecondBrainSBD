import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFinances } from '@/hooks/useFinances';
import { useBudgets } from '@/hooks/useBudgets';
import { useInvestments } from '@/hooks/useInvestments';
import { useCredits } from '@/hooks/useCredits';
import { useProjections } from '@/hooks/useProjections';
import { OverviewTab } from './tabs/OverviewTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { BudgetsTab } from './tabs/BudgetsTab';
import { InvestmentsTab } from './tabs/InvestmentsTab';
import { CreditsTab } from './tabs/CreditsTab';
import { ProjectionsTab } from './tabs/ProjectionsTab';

export function FinanceDashboard() {
  const {
    transactions, addTransaction, updateTransaction, deleteTransaction,
    stopRecurrence, bulkDelete, bulkUpdate,
    summary, monthComparison, categoryBreakdown, monthlyData,
  } = useFinances();

  const { budgets, addBudget, updateBudget, deleteBudget, budgetStatuses } = useBudgets(transactions);
  const { investments, addInvestment, updateInvestment, deleteInvestment, addEntry, deleteEntry, portfolioSummary } = useInvestments();
  const { credits, addCredit, updateCredit, deleteCredit, addPayment, creditsSummary } = useCredits();

  const { projectCashFlow, spendingForecast, whatIfScenario } = useProjections({
    transactions,
    budgets,
    credits,
    currentBalance: summary.balance,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-sm text-muted-foreground">{transactions.length} transacciones</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="budgets">Presupuestos</TabsTrigger>
          <TabsTrigger value="investments">Inversiones</TabsTrigger>
          <TabsTrigger value="credits">Creditos</TabsTrigger>
          <TabsTrigger value="projections">Proyecciones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            transactions={transactions}
            summary={summary}
            monthComparison={monthComparison}
            categoryBreakdown={categoryBreakdown}
            monthlyData={monthlyData}
            updateTransaction={updateTransaction}
            budgets={budgets}
            budgetStatuses={budgetStatuses}
            investments={investments}
            portfolioSummary={portfolioSummary}
            credits={credits}
            creditsSummary={creditsSummary}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab
            transactions={transactions}
            addTransaction={addTransaction}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            stopRecurrence={stopRecurrence}
            bulkDelete={bulkDelete}
            bulkUpdate={bulkUpdate}
          />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsTab
            budgets={budgets}
            budgetStatuses={budgetStatuses}
            transactions={transactions}
            addBudget={addBudget}
            updateBudget={updateBudget}
            deleteBudget={deleteBudget}
          />
        </TabsContent>

        <TabsContent value="investments">
          <InvestmentsTab
            investments={investments}
            portfolioSummary={portfolioSummary}
            addInvestment={addInvestment}
            updateInvestment={updateInvestment}
            deleteInvestment={deleteInvestment}
            addEntry={addEntry}
            deleteEntry={deleteEntry}
          />
        </TabsContent>

        <TabsContent value="credits">
          <CreditsTab
            credits={credits}
            creditsSummary={creditsSummary}
            addCredit={addCredit}
            updateCredit={updateCredit}
            deleteCredit={deleteCredit}
            addPayment={addPayment}
          />
        </TabsContent>

        <TabsContent value="projections">
          <ProjectionsTab
            projectCashFlow={projectCashFlow}
            spendingForecast={spendingForecast}
            whatIfScenario={whatIfScenario}
            currentBalance={summary.balance}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
