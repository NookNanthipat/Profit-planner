import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, AlertTriangle, Scale, Lock } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Scale size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Terms of Service</h1>
        </div>

        <section className="prose dark:prose-invert max-w-none space-y-8">
          <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-[32px] mb-12">
            <h2 className="text-rose-500 flex items-center gap-2 mt-0">
              <AlertTriangle size={20} /> IMPORTANT: FINANCIAL DISCLAIMER
            </h2>
            <p className="font-bold text-lg leading-relaxed">
              ProfitPlanner is a personal financial tracking tool provided for educational and informational purposes only. 
              <strong> We are NOT a financial advisor, licensed broker, or investment platform.</strong>
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>No Investment Advice: Any data, calculations, or simulations provided by this tool do not constitute investment advice.</li>
              <li>Accuracy of Data: We do not guarantee the accuracy of market data (stock prices, crypto rates) or the precision of financial calculations.</li>
              <li>User Responsibility: You are solely responsible for your financial decisions and any outcomes resulting from the use of this application.</li>
              <li>Limitation of Liability: ProfitPlanner and its creators shall NOT be liable for any financial losses, damages, or errors.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield size={20} className="text-primary" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ProfitPlanner, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Lock size={20} className="text-primary" /> 2. Use of the Service
            </h2>
            <p>
              You must be at least 18 years old to use this service. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">3. Intellectual Property</h2>
            <p>
              The code, design, and branding of ProfitPlanner are the property of its creators. You may not copy, modify, or redistribute our intellectual property without express permission.
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground pt-12 border-t border-border">
            <p>Last updated: April 29, 2026</p>
            <p>Contact: support@profitplanner.app (Example)</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
