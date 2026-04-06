"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { useUser } from "@/hooks/use-user";
import { mockVideos } from "@/lib/mock-data";
import { Wand2, Play, Download, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const statusConfig = {
  ready: { label: "Ready", icon: CheckCircle, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  generating: { label: "Generating", icon: Loader2, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  queued: { label: "Queued", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  error: { label: "Error", icon: AlertCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function DashboardPage() {
  const { profile, loading } = useUser();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Welcome back{profile?.email ? `, ${profile.email.split("@")[0]}` : ""} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Create your next viral UGC ad in seconds
          </p>
        </div>
        <Link href="/app/generate">
          <Button className="gradient-bg text-white cursor-pointer shadow-lg">
            <Wand2 className="w-4 h-4 mr-2" />
            New Video
          </Button>
        </Link>
      </div>

      {/* Upgrade Banner */}
      <UpgradeBanner />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Credits Left", value: loading ? "—" : profile?.credits ?? 0, icon: "💳" },
          { label: "Videos Created", value: mockVideos.length, icon: "🎬" },
          { label: "Videos Ready", value: mockVideos.filter(v => v.status === "ready").length, icon: "✅" },
          { label: "In Queue", value: mockVideos.filter(v => v.status === "queued" || v.status === "generating").length, icon: "⏳" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-heading">Recent Videos</h2>
          <Link href="/app/history">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mockVideos.map((video) => {
              const status = statusConfig[video.status];
              const StatusIcon = status.icon;
              return (
                <Card key={video.id} className="group border-border/50 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="aspect-[9/16] bg-gradient-to-b from-primary/10 to-accent/10 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        {video.status === "ready" ? (
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 group-hover:scale-110 transition-transform cursor-pointer">
                            <Play className="w-6 h-6 text-white ml-0.5" />
                          </div>
                        ) : (
                          <StatusIcon className={`w-8 h-8 ${video.status === "generating" ? "animate-spin text-blue-400" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <Badge className={`${status.color} border text-xs`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${video.status === "generating" ? "animate-spin" : ""}`} />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium line-clamp-2">
                        {video.script.substring(0, 60)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        {video.status === "ready" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
