"use client";

import { Search, Bell, ChevronDown } from "lucide-react";
import Image from "next/image";

export default function Topbar() {
  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60 flex items-center px-6 gap-4 z-10">
      {/* Workspace label */}
      <span className="text-sm text-gray-500 font-medium border-r border-gray-800 pr-4 mr-1">
        Global Lab Workspace
      </span>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search assets, attacks, or users..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-800">
          <div className="flex flex-col items-end">
            <span className="text-sm text-white font-semibold -mt-0.5">John Doe</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-800">
            JD
          </div>
        </div>
      </div>
    </header>
  );
}