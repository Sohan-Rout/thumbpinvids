"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-heading gradient-text">
              Adora AI
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Reviews
            </a>
          </div>

          {/* CTA + Theme */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="cursor-pointer">Log In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="gradient-bg text-white hover:opacity-90 cursor-pointer shadow-lg">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-3 animate-slide-down">
            <a href="#features" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              How it Works
            </a>
            <a href="#pricing" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <a href="#testimonials" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Reviews
            </a>
            <div className="flex gap-2 pt-2">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" className="w-full cursor-pointer">Log In</Button>
              </Link>
              <Link href="/auth/signup" className="flex-1">
                <Button className="w-full gradient-bg text-white cursor-pointer">Start Free</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
