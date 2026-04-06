"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wand2,
  Clock,
  Users,
  CreditCard,
  User,
  Sparkles,
  LogOut,
  LayoutTemplate,
  Video,
  ImageIcon,
  Clapperboard,
  Building2,
  PersonStanding,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreditsBadge } from "./credits-badge";
import { signOut } from "next-auth/react";

const mainNav = [
  { title: "Dashboard", href: "/app", icon: Home },
  { title: "AI Studio", href: "/app/prototype", icon: Clapperboard },
  { title: "UGC Creator", href: "/app/ugc-creator", icon: Sparkles },
  { title: "Generate Video", href: "/app/generate", icon: Wand2 },
  { title: "Text to Video", href: "/app/text-to-video", icon: Video },
  { title: "Real Estate Video", href: "/app/real-estate-video", icon: Building2 },
  { title: "AI Walkthrough", href: "/app/ai-walkthrough", icon: PersonStanding },
  { title: "Image Gen", href: "/app/image-gen", icon: ImageIcon },
  { title: "Templates", href: "/app/templates", icon: LayoutTemplate },
];

const libraryNav = [
  { title: "Avatar Library", href: "/app/avatars", icon: Users },
  { title: "Video History", href: "/app/history", icon: Clock },
  { title: "Credits", href: "/app/credits", icon: CreditCard },
  { title: "Profile", href: "/app/profile", icon: User },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold font-heading gradient-text">Adora AI</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Creation Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library & Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <CreditsBadge />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
