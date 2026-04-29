import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, Eye, Database, Trash2 } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Privacy Policy</h1>
        </div>

        <section className="prose dark:prose-invert max-w-none space-y-8">
          <p className="text-lg leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal data in compliance with the **Personal Data Protection Act (PDPA)** of Thailand.
          </p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Eye size={20} className="text-primary" /> 1. Data Collection
            </h2>
            <p>We collect the following information:</p>
            <ul className="list-disc pl-5">
              <li>Account Info: Email address used for authentication via Supabase.</li>
              <li>Financial Data: Transactions, assets, and budget inputs provided by you.</li>
              <li>Usage Data: Basic analytics to improve app performance.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Database size={20} className="text-primary" /> 2. Purpose of Processing
            </h2>
            <p>
              Your data is processed strictly to provide the core functionality of ProfitPlanner, including calculating your financial health, simulations, and displaying your ledger. 
              <strong> We do not sell your personal or financial data to third parties.</strong>
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 size={20} className="text-primary" /> 3. Your Rights (PDPA)
            </h2>
            <p>Under the PDPA, you have the following rights:</p>
            <ul className="list-disc pl-5">
              <li>Right to Access: You can view all your data within the app dashboards.</li>
              <li>Right to Rectification: You can edit any transaction or asset entry.</li>
              <li>Right to Erasure: You have the right to request the deletion of your account and all associated data.</li>
            </ul>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground pt-12 border-t border-border">
            <p>Last updated: April 29, 2026</p>
            <p>Contact: privacy@profitplanner.app (Example)</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
