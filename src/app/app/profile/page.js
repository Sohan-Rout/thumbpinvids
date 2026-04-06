"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/lib/actions/auth";
import {
  User,
  Mail,
  CreditCard,
  Calendar,
  Crown,
  LogOut,
  ExternalLink,
} from "lucide-react";

export default function ProfilePage() {
  const { profile, loading } = useUser();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and subscription
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className="gradient-bg p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {profile?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <h2 className="text-lg font-bold">
                {profile?.email?.split("@")[0] || "User"}
              </h2>
              <p className="text-sm text-white/80">{profile?.email || "—"}</p>
              <Badge className="mt-2 bg-white/20 text-white border-0 hover:bg-white/30">
                <Crown className="w-3 h-3 mr-1" />
                {profile?.subscription_tier === "pro" ? "Pro Plan" : "Free Plan"}
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Email</span>
            </div>
            <span className="text-sm text-muted-foreground">{profile?.email || "—"}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Credits</span>
            </div>
            <Badge variant="secondary">{loading ? "—" : `${profile?.credits ?? 0} credits`}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Crown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Plan</span>
            </div>
            <span className="text-sm text-muted-foreground capitalize">
              {profile?.subscription_tier || "free"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Member Since</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.subscription_tier === "pro" ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Pro – ₹9,440/month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits per month</span>
                <span>500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Next billing</span>
                <span>Feb 15, 2025</span>
              </div>
              <Separator />
              <Button variant="outline" className="w-full cursor-pointer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Subscription (Razorpay)
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                You&apos;re on the Free plan. Upgrade to Pro for 500 credits/month.
              </p>
              <Button className="gradient-bg text-white cursor-pointer">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro – ₹9,440/mo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <form action={signOut}>
            <Button variant="destructive" className="w-full cursor-pointer" type="submit">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
