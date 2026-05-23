"use client";

import React from "react";
import { Settings, User, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* Account Section */}
        <section className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Account Details</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Update your account information and email address.
          </p>
          <form className="flex flex-col gap-4 max-w-md" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                disabled
                defaultValue="user@example.com"
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors w-fit"
            >
              Request Email Change
            </button>
          </form>
        </section>

        {/* Notifications Section */}
        <section className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Manage how you receive alerts and updates.
          </p>
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <span className="text-gray-300 font-medium">New Releases</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-300 font-medium">App Updates</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
          </div>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-medium py-2 px-4 rounded-lg transition-colors w-fit"
            >
              Sign Out of All Devices
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}