"use client";

import { motion } from "framer-motion";
import { Users, Mic, Zap, Video, Shield, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "20+ AI Avatars",
    description: "Diverse Indian faces – North, South, East, West. Ethical stock library or upload your own.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Mic,
    title: "Indian-Accent Voices",
    description: "10 natural Indian-English voices – Mumbai, Delhi, Bangalore, Hyderabad & more.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Video,
    title: "9:16 Reel Format",
    description: "Vertical videos optimized for Instagram Reels, YouTube Shorts & TikTok. 15-30 seconds.",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Zap,
    title: "Under 2 Min Generation",
    description: "Script to video in under 2 minutes. Async queue processing for zero wait time.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Lip-Sync Technology",
    description: "State-of-the-art AI lip-sync. Your avatars speak naturally with perfect mouth movements.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Gauge,
    title: "10 Free Credits",
    description: "Start with 10 free video generations. No credit card required. Upgrade anytime.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to Create{" "}
            <span className="gradient-text">Viral Ads</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional UGC video ads without hiring creators, studios, or editors. 
            Built specifically for the Indian market.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={item}>
              <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm h-full">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
