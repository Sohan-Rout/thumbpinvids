"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockVideos } from "@/lib/mock-data";
import {
  Download,
  Share2,
  RotateCcw,
  Play,
  CheckCircle,
  Loader2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const statusConfig = {
  ready: { label: "Ready", icon: CheckCircle, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  generating: { label: "Generating", icon: Loader2, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  queued: { label: "Queued", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  error: { label: "Error", icon: AlertCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function HistoryPage() {
  const [view, setView] = useState("table"); // table or grid

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Video History</h1>
          <p className="text-muted-foreground mt-1">
            All your generated videos in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            className="cursor-pointer"
            onClick={() => setView("table")}
          >
            Table
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            className="cursor-pointer"
            onClick={() => setView("grid")}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Table View */}
      {view === "table" ? (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Preview</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockVideos.map((video) => {
                  const status = statusConfig[video.status];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="w-10 h-16 rounded-md bg-gradient-to-b from-primary/10 to-accent/10 flex items-center justify-center">
                          <Play className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] sm:max-w-[300px]">
                        <p className="text-sm truncate">{video.script}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border text-xs`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${video.status === "generating" ? "animate-spin" : ""}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(video.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {video.status === "ready" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Link href="/app/generate">
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockVideos.map((video) => {
            const status = statusConfig[video.status];
            const StatusIcon = status.icon;
            return (
              <Card key={video.id} className="group border-border/50 hover:shadow-lg transition-all overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-[9/16] bg-gradient-to-b from-primary/10 to-accent/10 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {video.status === "ready" ? (
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 cursor-pointer">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      ) : (
                        <StatusIcon className={`w-8 h-8 ${video.status === "generating" ? "animate-spin text-blue-400" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-sm line-clamp-2">{video.script}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                      <div className="flex gap-1">
                        {video.status === "ready" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled className="cursor-pointer">
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <Badge variant="secondary">Page 1 of 1</Badge>
        <Button variant="outline" size="sm" disabled className="cursor-pointer">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
