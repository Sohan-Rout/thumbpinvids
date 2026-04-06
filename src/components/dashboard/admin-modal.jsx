"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Search, RefreshCcw, Users, Video } from "lucide-react";
import { mockVideos } from "@/lib/mock-data";
import { toast } from "sonner";

const mockUsers = [
  { id: "u1", email: "ritika@skincarebrand.in", credits: 45, tier: "pro", videos: 23 },
  { id: "u2", email: "kunal@d2cfoundr.com", credits: 3, tier: "free", videos: 7 },
  { id: "u3", email: "neha@influencer.co", credits: 0, tier: "free", videos: 10 },
  { id: "u4", email: "arjun@ecomstore.in", credits: 120, tier: "pro", videos: 56 },
  { id: "u5", email: "priya@marketingagency.in", credits: 8, tier: "free", videos: 2 },
];

export function AdminModal() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredUsers = mockUsers.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleRefillCredits(userId, email) {
    toast.success(`Refilled 10 credits for ${email}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer" title="Admin Panel">
          <Shield className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="cursor-pointer">
              <Users className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="videos" className="cursor-pointer">
              <Video className="w-4 h-4 mr-2" /> Videos
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.credits > 5 ? "secondary" : "destructive"}>
                        {user.credits}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.tier === "pro" ? "default" : "outline"} className="capitalize">
                        {user.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.videos}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => handleRefillCredits(user.id, user.email)}
                      >
                        <RefreshCcw className="w-3 h-3 mr-1" /> +10 Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video ID</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockVideos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="text-xs font-mono">{video.id}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{video.script}</TableCell>
                    <TableCell>
                      <Badge variant={
                        video.status === "ready" ? "default" :
                        video.status === "error" ? "destructive" : "secondary"
                      } className="capitalize">
                        {video.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
