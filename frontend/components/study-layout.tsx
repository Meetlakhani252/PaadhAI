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
        <div
          className="relative min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: "url('/dashboard_Img.jpg')",
          }}
        >
          {/* Balanced contrast overlay to ensure all dashboard cards, charts, and text remain crisp and readable */}
          <div className="fixed inset-0 bg-background/85 dark:bg-background/90 backdrop-blur-[2px] pointer-events-none -z-10" />

          <SidebarProvider className="relative bg-transparent">
            <AppSidebar />
            <SidebarInset className="min-h-screen bg-transparent">
              <DashboardTopbar />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </SubjectsProvider>
    </ProfileProvider>
  );
}

