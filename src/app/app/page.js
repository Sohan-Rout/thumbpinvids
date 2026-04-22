"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { useUser } from "@/hooks/use-user";
import {
  Wand2,
  Video,
  Image,
  CreditCard,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { profile, loading: userLoading } = useUser();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  const loading = userLoading || loadingStats;

  const userName = profile?.name || profile?.email?.split("@")[0] || "there";

  const statCards = [
    {
      label: "Credits Left",
      value: loading ? null : (profile?.credits ?? 0),
      icon: CreditCard,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Total Videos",
      value: loading ? null : (stats?.totalVideos ?? 0),
      icon: Video,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Composites",
      value: loading ? null : (stats?.totalComposites ?? 0),
      icon: Layers,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Total Assets",
      value: loading ? null : (stats?.totalAssets ?? 0),
      icon: Image,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  const quickActions = [
    {
      title: "Text to Video",
      description: "Generate a UGC video from a script",
      href: "/app/text-to-video",
      icon: Video,
    },
    {
      title: "Real Estate",
      description: "Create property walkthrough videos",
      href: "/app/ai-walkthrough",
      icon: Sparkles,
    },
    {
      title: "Product Video",
      description: "Generate product showcase videos",
      href: "/app/product-to-video",
      icon: Wand2,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-heading tracking-tight">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your videos
          </p>
        </div>
        <Link href="/app/text-to-video">
          <Button className="gradient-bg text-white cursor-pointer shadow-sm h-9 text-sm">
            <Wand2 className="w-4 h-4 mr-2" />
            New Video
          </Button>
        </Link>
      </div>

      {/* Upgrade Banner */}
      <UpgradeBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                {stat.value === null ? (
                  <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
