"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  BookOpenText,
  FileSearch,
  FolderGit2,
  Home,
  Layers,
  LogOut,
  MessageSquareText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ProfileDialog } from "@/components/profile-dialog";
import { initialsOf, useProfile } from "@/lib/profile";

const NAV = [
  { title: "Home", to: "/dashboard", icon: Home },
  { title: "Subjects", to: "/subjects", icon: BookOpenText },
  { title: "Materials", to: "/materials", icon: FolderGit2 },
  { title: "Tutor", to: "/tutor", icon: Sparkles },
  { title: "Doubts", to: "/doubts", icon: MessageSquareText },
  { title: "Papers", to: "/papers", icon: FileSearch },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut: clerkSignOut } = useClerk();
  const { profile } = useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const displayName = profile.name.trim() || "Your profile";

  const handleSignOut = async () => {
    try {
      await clerkSignOut();
      router.push("/");
      toast.success("Signed out — see you soon.");
    } catch {
      router.push("/");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <ProfileDialog open={editOpen} onOpenChange={setEditOpen} />

      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="PaadhAI">
              <Link href="/dashboard">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Layers className="size-4" />
                </span>
                <span className="wordmark text-lg leading-none">
                  Paadh<span className="mark">AI</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                    tooltip={item.title}
                  >
                    <Link href={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={displayName}>
                  <Avatar className="size-8 rounded-lg">
                    {profile.avatar && (
                      <AvatarImage src={profile.avatar} alt={displayName} />
                    )}
                    <AvatarFallback className="rounded-lg bg-primary text-xs text-primary-foreground">
                      {initialsOf(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col items-start gap-0.5 leading-tight">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      PaadhAI Account
                    </span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="flex items-center gap-3 p-3">
                  <Avatar className="size-9 rounded-lg">
                    {profile.avatar && (
                      <AvatarImage src={profile.avatar} alt={displayName} />
                    )}
                    <AvatarFallback className="rounded-lg bg-primary text-xs text-primary-foreground">
                      {initialsOf(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Active Session
                    </span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <UserRound />
                  Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

