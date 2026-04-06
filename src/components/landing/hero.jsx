"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered UGC Generator</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Generate{" "}
              <span className="gradient-text">UGC Ads</span>
              <br />
              in 60 Seconds
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Script to Reel – instantly. Create viral talking-head videos with 
              <span className="text-foreground font-semibold"> AI actors</span>, 
              <span className="text-foreground font-semibold"> Indian-accent voices</span>, and 
              <span className="text-foreground font-semibold"> lip-sync magic</span>. 
              Made for Indian brands & creators.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/auth/signup">
                <Button size="lg" className="gradient-bg text-white text-lg px-8 py-6 shadow-xl hover:opacity-90 cursor-pointer group">
                  Start Free – 10 Credits
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 cursor-pointer group">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★★★★★</span>
                <span>4.9/5 Rating</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <span>1000+ Creators</span>
              <div className="w-px h-4 bg-border" />
              <span>10K+ Videos</span>
            </div>
          </motion.div>

          {/* Right – Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="relative animate-float">
              {/* Phone Frame */}
              <div className="w-64 sm:w-72 aspect-[9/16] rounded-3xl gradient-bg p-0.5 shadow-2xl glow-purple">
                <div className="w-full h-full rounded-3xl bg-card overflow-hidden flex flex-col items-center justify-center p-6">
                  {/* Mock Video Content */}
                  <div className="w-full aspect-[9/16] rounded-2xl bg-gradient-to-b from-primary/20 to-accent/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border-2 border-white/40">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                      <p className="text-white text-sm font-medium">AI Generated Reel</p>
                      <p className="text-white/70 text-xs mt-1">9:16 Vertical • 15-30s</p>
                    </div>
                    {/* Fake UI overlay */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <div className="h-2 w-16 bg-white/30 rounded-full mb-2" />
                      <div className="h-2 w-24 bg-white/20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-16 top-1/4 glass-card rounded-xl p-3 shadow-lg animate-slide-up hidden sm:block" style={{ animationDelay: "0.5s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Voice: Mumbai Female</p>
                    <p className="text-xs text-muted-foreground">Indian English</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-12 bottom-1/3 glass-card rounded-xl p-3 shadow-lg animate-slide-up hidden sm:block" style={{ animationDelay: "0.8s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs font-semibold text-green-500">Ready in 58s</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
