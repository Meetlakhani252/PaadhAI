"use client";

import { type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SubjectsProvider } from "@/lib/demo-store";
import { ProfileProvider } from "@/lib/profile";

export function StudyLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <SubjectsProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-h-screen bg-background">
            <DashboardTopbar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </SubjectsProvider>
    </ProfileProvider>
  );
}

