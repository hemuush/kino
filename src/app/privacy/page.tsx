"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Update this whenever the policy text below actually changes.
const LAST_UPDATED = 'September 3, 2026';

export default function PrivacyPolicy() {
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
              <Shield size={20} />
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-foreground">
              Privacy Policy
            </h1>
          </div>
          
          <div className="prose prose-neutral dark:prose-invert prose-p:text-muted-foreground max-w-none space-y-6 text-sm leading-relaxed">
            <p className="text-base font-medium text-foreground">Last Updated: {LAST_UPDATED}</p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">1. Introduction</h2>
              <p>Welcome to Kino. We are committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy explains how we collect, use, and safeguard your data when you use our application.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">2. Data Storage & Google Drive Integration</h2>
              <p>Kino is a local-first application designed with privacy at its core. <strong>We do not host, store, or process your data on our own servers.</strong></p>
              <p>When you authenticate with Google, our application requests access solely to a dedicated application data folder within your Google Drive (<code>https://www.googleapis.com/auth/drive.appdata</code>). All your collections, ratings, and custom metadata are stored strictly within this isolated folder in your personal Google Drive account. We cannot read your other personal Google Drive files, and nobody else can access your Kino data.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">3. Information We Process</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong>Authentication Data:</strong> We use Google OAuth to authenticate you. We receive a token to securely read/write to your Google Drive AppData folder.</li>
                <li><strong>Profile Information:</strong> We access your basic Google profile (Name, Email, Profile Picture) strictly to display it within the application interface. This data is kept locally on your device and is never transmitted to any external third-party server.</li>
                <li><strong>Media Collections:</strong> Information about movies, TV shows, or anime that you add is saved directly to your Google Drive.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">4. Your Control and Rights</h2>
              <p>Since your data is stored in your personal Google Drive account, you retain complete ownership and control. You can permanently delete your data at any time by clearing your application data from your Google Account settings, or by deleting the data via the application settings interface.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-bold text-foreground">5. Changes to this Policy</h2>
              <p>We may update this Privacy Policy periodically to reflect changes in our practices. We encourage you to review this page occasionally. Your continued use of the application after any changes signifies your acceptance of the updated terms.</p>
            </section>
            
            <section className="space-y-3 pt-6 mt-6 border-t border-border/40">
              <p>If you have any questions or concerns regarding this Privacy Policy, please reach out via our official repository or support channels.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
