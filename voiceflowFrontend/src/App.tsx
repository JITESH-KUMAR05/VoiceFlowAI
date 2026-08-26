import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AgentAnalytics from "./pages/agent/AgentAnalytics";
import AgentCRM from "./pages/agent/AgentCRM";
import AgentCalls from "./pages/agent/AgentCalls";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentTest from "./pages/agent/AgentTest";
import AgentUserDetail from "./pages/agent/AgentUserDetail";
import AgentUsers from "./pages/agent/AgentUsers";
import type { AgentType } from "./types/agent";

const queryClient = new QueryClient();

/**
 * Both agents run the same screens, so the routes are generated per agent
 * rather than written out twice.
 */
const AGENTS: AgentType[] = ["b2b", "real-estate"];

function agentRoutes(agentType: AgentType) {
  const base = `/${agentType}`;
  return [
    <Route
      key={base}
      path={base}
      element={<AgentDashboard agentType={agentType} />}
    />,
    <Route
      key={`${base}/test`}
      path={`${base}/test`}
      element={<AgentTest agentType={agentType} />}
    />,
    <Route
      key={`${base}/crm`}
      path={`${base}/crm`}
      element={<AgentCRM agentType={agentType} />}
    />,
    <Route
      key={`${base}/crm/users`}
      path={`${base}/crm/users`}
      element={<AgentUsers agentType={agentType} />}
    />,
    <Route
      key={`${base}/crm/calls`}
      path={`${base}/crm/calls`}
      element={<AgentCalls agentType={agentType} />}
    />,
    <Route
      key={`${base}/crm/user/:id`}
      path={`${base}/crm/user/:id`}
      element={<AgentUserDetail agentType={agentType} />}
    />,
    <Route
      key={`${base}/analytics`}
      path={`${base}/analytics`}
      element={<AgentAnalytics agentType={agentType} />}
    />,
  ];
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          {AGENTS.flatMap(agentRoutes)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
