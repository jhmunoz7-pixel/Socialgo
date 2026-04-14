/**
 * User menu component
 * Shows authenticated user's email and provides sign out action
 * Client-side component for interactivity
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
// Button not used here — UserMenu renders its own styled buttons
import type { AuthUser } from "@/types";

interface UserMenuProps {
  user: AuthUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Redirect happens via Supabase's redirect config
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-md px-lg py-md rounded-md bg-navy hover:bg-navy/80 transition-smooth"
      >
        <div className="w-8 h-8 rounded-full bg-inchworm flex items-center justify-center text-navy font-bold text-body-sm">
          {user.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <span className="text-body-sm text-seashell hidden sm:inline truncate max-w-xs">
          {user.email}
        </span>
        <svg
          className={`w-4 h-4 text-aurometal transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-md w-48 bg-charcoal border border-aurometal/20 rounded-lg shadow-lg py-md z-50">
          <div className="px-lg py-md border-b border-aurometal/20">
            <p className="text-body-xs text-aurometal">Signed in as</p>
            <p className="text-body-sm text-seashell font-bold truncate">
              {user.email}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="block px-lg py-md text-body-sm text-seashell hover:bg-navy transition-smooth"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/settings"
            className="block px-lg py-md text-body-sm text-seashell hover:bg-navy transition-smooth"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>

          <Link
            href="/dashboard/billing"
            className="block px-lg py-md text-body-sm text-seashell hover:bg-navy transition-smooth"
            onClick={() => setIsOpen(false)}
          >
            Billing
          </Link>

          <div className="border-t border-aurometal/20 my-md" />

          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full text-left px-lg py-md text-body-sm text-red-500 hover:bg-navy transition-smooth disabled:opacity-50"
          >
            {isLoading ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 40 }}
        />
      )}
    </div>
  );
}
