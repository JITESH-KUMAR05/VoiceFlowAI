import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentAnalytics from "./pages/agent/AgentAnalytics";
import AgentCRM from "./pages/agent/AgentCRM";
import AgentUsers from "./pages/agent/AgentUsers";
import NotFound from "./pages/NotFound";

// B2B Sales Agent Pages
import B2BTest from "./pages/b2b/B2BTest";
import B2BLiveCall from "./pages/b2b/B2BLiveCall";
import B2BCalls from "./pages/b2b/B2BCalls";
import B2BUserDetail from "./pages/b2b/B2BUserDetail";

// Real Estate Agent Pages
import RealEstateTest from "./pages/real-estate/RealEstateTest";
import RealEstateLiveCall from "./pages/real-estate/RealEstateLiveCall";
import RealEstateCalls from "./pages/real-estate/RealEstateCalls";
import RealEstateUserDetail from "./pages/real-estate/RealEstateUserDetail";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* [FIX] Add future flags */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Index />} />
          
          {/* B2B Sales Agent Routes */}
          <Route path="/b2b" element={<AgentDashboard agentType="b2b" />} />
          <Route path="/b2b/test" element={<B2BTest />} />
          <Route path="/b2b/live-call" element={<B2BLiveCall />} />
          <Route path="/b2b/crm" element={<AgentCRM agentType="b2b" />} />
          <Route path="/b2b/crm/users" element={<AgentUsers agentType="b2b" />} />
          <Route path="/b2b/crm/calls" element={<B2BCalls />} />
          <Route path="/b2b/crm/user/:id" element={<B2BUserDetail />} />
          <Route path="/b2b/analytics" element={<AgentAnalytics agentType="b2b" />} />
          
          {/* Real Estate Agent Routes */}
          <Route path="/real-estate" element={<AgentDashboard agentType="real-estate" />} />
          <Route path="/real-estate/test" element={<RealEstateTest />} />
          <Route path="/real-estate/live-call" element={<RealEstateLiveCall />} />
          <Route path="/real-estate/crm" element={<AgentCRM agentType="real-estate" />} />
          <Route path="/real-estate/crm/users" element={<AgentUsers agentType="real-estate" />} />
          <Route path="/real-estate/crm/calls" element={<RealEstateCalls />} />
          <Route path="/real-estate/crm/user/:id" element={<RealEstateUserDetail />} />
          <Route path="/real-estate/analytics" element={<AgentAnalytics agentType="real-estate" />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
