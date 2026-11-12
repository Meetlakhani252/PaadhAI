import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ProfileProvider } from "@/lib/profile";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyStack — Know what to study, get unstuck, beat the paper",
  description: "Subject-agnostic learning platform for syllabus tracking, AI doubt resolution, and paper analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:ital,wght@0,300..700;1,300..700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-full flex flex-col font-sans">
          <ProfileProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ProfileProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
