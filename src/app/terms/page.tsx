"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsOfService() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground font-sans px-4 py-12 md:py-24">
      <div className="max-w-3xl mx-auto pb-32">
        <Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Login
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-foreground">
              Terms of Service
            </h1>
          </div>
          
          <div className="prose prose-neutral dark:prose-invert prose-p:text-muted-foreground max-w-none space-y-6 text-sm leading-relaxed">
            <p className="text-base font-medium text-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing and using the Kino application ("Service", "App", "Kino"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">2. Description of Service</h2>
              <p>Kino is a media tracking application that allows users to search, save, and organize metadata regarding movies, television shows, and anime. The service functions primarily on your local device and syncs data explicitly to a designated application folder in your personal Google Drive account.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">3. Google Drive Integration & User Responsibility</h2>
              <p>Kino relies on Google Drive API (specifically the AppData scope) to store your collections. By using the Service, you acknowledge that:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>You are solely responsible for maintaining the security of your Google account.</li>
                <li>Data availability is dependent on Google Drive's uptime and your available storage quota.</li>
                <li>We are not responsible for any accidental deletion, corruption, or loss of data stored on your Google Drive.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">4. Acceptable Use</h2>
              <p>You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, overburden, or impair the Service. You also agree not to interfere with the security of, or otherwise abuse, the Service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">5. Limitation of Liability</h2>
              <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the Service.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">6. Modifications to the Service</h2>
              <p>We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. You agree that we shall not be liable to you or to any third party for any modification, suspension or discontinuance of the Service.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
