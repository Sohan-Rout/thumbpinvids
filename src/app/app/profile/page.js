"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { signOut } from "next-auth/react";
import {
  Mail,
  CreditCard,
  Calendar,
  Crown,
  LogOut,
  Shield,
} from "lucide-react";

export default function ProfilePage() {
  const { user, profile, loading } = useUser();

  const displayName = profile?.name || user?.name || profile?.email?.split("@")[0] || "User";
  const displayEmail = profile?.email || user?.email || "—";
  const plan = profile?.plan || "free";
  const credits = profile?.credits ?? 0;
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const userImage = user?.image || profile?.image || null;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold font-heading tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border border-border/50 overflow-hidden">
        <div className="gradient-bg px-6 py-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 border-2 border-white/30">
              {userImage && <AvatarImage src={userImage} alt={displayName} />}
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-28 bg-white/20 mb-1" />
                  <Skeleton className="h-4 w-40 bg-white/20" />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{displayName}</h2>
                  <p className="text-sm text-white/80">{displayEmail}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-0">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Email</span>
            </div>
            <span className="text-sm text-muted-foreground">{displayEmail}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Credits</span>
            </div>
            {loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <Badge variant="secondary" className="text-xs">{credits} credits</Badge>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Plan</span>
            </div>
            <Badge variant={plan === "pro" ? "default" : "secondary"} className="text-xs capitalize">
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Joined</span>
            </div>
            <span className="text-sm text-muted-foreground">{joinDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan === "pro" ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Pro – ₹9,440/month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits/month</span>
                <span>500</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade to Pro for 500 credits/month and priority rendering.
              </p>
              <Button className="gradient-bg text-white cursor-pointer h-9 text-sm">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Out */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full cursor-pointer h-9 text-sm text-destructive hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
