import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Finances from "./pages/Finances";
import Contacts from "./pages/Contacts";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EnvironmentProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/contacts" element={<Contacts />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EnvironmentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
