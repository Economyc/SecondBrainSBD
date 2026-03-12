import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { PageTransition } from './PageTransition';
import { useEnvironment } from '@/contexts/EnvironmentContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { environment, isTransitioning } = useEnvironment();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground transition-opacity duration-150"
                style={{ opacity: isTransitioning ? 0 : 1 }}
              >
                {environment}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div
              className="transition-all duration-200 ease-out"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
              }}
            >
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
