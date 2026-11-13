"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/subjects": "Subjects",
  "/materials": "Materials",
  "/doubts": "Doubts",
  "/papers": "Papers",
};

export function DashboardTopbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "PaadhAI";

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-8">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
    </header>
  );
}

