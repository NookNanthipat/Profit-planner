import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminEditProvider } from "@/context/AdminEditContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Portal from "./pages/Portal.tsx";
import Checkout from "./pages/Checkout.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

import ProfitPlannerLayout from "./pages/app/ProfitPlannerLayout.tsx";
import ProfitPlannerDashboard from "./pages/app/profit-planner/Dashboard.tsx";
import ProfitPlannerTransactions from "./pages/app/profit-planner/Transactions.tsx";
import ProfitPlannerSetup from "./pages/app/profit-planner/Setup.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProfitPlannerRecurring from "./pages/app/profit-planner/Recurring.tsx";
import ProfitPlannerBudget from "./pages/app/profit-planner/Budget.tsx";
import ProfitPlannerAnnual from "./pages/app/profit-planner/AnnualDashboard.tsx";
import ProfitPlannerDebt from "./pages/app/profit-planner/DebtManagement.tsx";
import ProfitPlannerSplit from "./pages/app/profit-planner/SplitPayment.tsx";
import ProfitPlannerPortfolio from "./pages/app/profit-planner/Portfolio.tsx";
import ProfitPlannerSimulator from "./pages/app/profit-planner/Simulator.tsx";
import TermsOfService from "./pages/TermsOfService.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import CookieConsent from "./components/CookieConsent.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AdminEditProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <CookieConsent />
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/tos" element={<TermsOfService />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />
                <Route path="/checkout/:slug" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route path="/app/profit-planner" element={<ProtectedRoute><ProfitPlannerLayout /></ProtectedRoute>}>
                  <Route index element={<ProfitPlannerDashboard />} />
                  <Route path="dashboard" element={<ProfitPlannerDashboard />} />
                  <Route path="annual" element={<ProfitPlannerAnnual />} />
                  <Route path="transactions" element={<ProfitPlannerTransactions />} />
                  <Route path="setup" element={<ProfitPlannerSetup />} />
                  <Route path="recurring" element={<ProfitPlannerRecurring />} />  
                  <Route path="budget" element={<ProfitPlannerBudget />} /> 
                  <Route path="debt" element={<ProfitPlannerDebt />} />      
                  <Route path="split" element={<ProfitPlannerSplit />} />
                  <Route path="portfolio" element={<ProfitPlannerPortfolio />} />
                  <Route path="simulator" element={<ProfitPlannerSimulator />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AdminEditProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
