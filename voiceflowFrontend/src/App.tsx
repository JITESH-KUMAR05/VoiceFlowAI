import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// B2B Sales Agent Pages
import B2BDashboard from "./pages/b2b/B2BDashboard";
import B2BTest from "./pages/b2b/B2BTest";
import B2BLiveCall from "./pages/b2b/B2BLiveCall";
import B2BCRM from "./pages/b2b/B2BCRM";
import B2BUsers from "./pages/b2b/B2BUsers";
import B2BCalls from "./pages/b2b/B2BCalls";
import B2BUserDetail from "./pages/b2b/B2BUserDetail";
import B2BAnalytics from "./pages/b2b/B2BAnalytics";

// Real Estate Agent Pages
import RealEstateDashboard from "./pages/real-estate/RealEstateDashboard";
import RealEstateTest from "./pages/real-estate/RealEstateTest";
import RealEstateLiveCall from "./pages/real-estate/RealEstateLiveCall";
import RealEstateCRM from "./pages/real-estate/RealEstateCRM";
import RealEstateUsers from "./pages/real-estate/RealEstateUsers";
import RealEstateCalls from "./pages/real-estate/RealEstateCalls";
import RealEstateUserDetail from "./pages/real-estate/RealEstateUserDetail";
import RealEstateAnalytics from "./pages/real-estate/RealEstateAnalytics";

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
          <Route path="/b2b" element={<B2BDashboard />} />
          <Route path="/b2b/test" element={<B2BTest />} />
          <Route path="/b2b/live-call" element={<B2BLiveCall />} />
          <Route path="/b2b/crm" element={<B2BCRM />} />
          <Route path="/b2b/crm/users" element={<B2BUsers />} />
          <Route path="/b2b/crm/calls" element={<B2BCalls />} />
          <Route path="/b2b/crm/user/:id" element={<B2BUserDetail />} />
          <Route path="/b2b/analytics" element={<B2BAnalytics />} />
          
          {/* Real Estate Agent Routes */}
          <Route path="/real-estate" element={<RealEstateDashboard />} />
          <Route path="/real-estate/test" element={<RealEstateTest />} />
          <Route path="/real-estate/live-call" element={<RealEstateLiveCall />} />
          <Route path="/real-estate/crm" element={<RealEstateCRM />} />
          <Route path="/real-estate/crm/users" element={<RealEstateUsers />} />
          <Route path="/real-estate/crm/calls" element={<RealEstateCalls />} />
          <Route path="/real-estate/crm/user/:id" element={<RealEstateUserDetail />} />
          <Route path="/real-estate/analytics" element={<RealEstateAnalytics />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
