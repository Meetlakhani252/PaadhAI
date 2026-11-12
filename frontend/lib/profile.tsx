"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";

export type Profile = { name: string; avatar: string | null };

const STORAGE_KEY = "studystack.profile.v1";
const EMPTY_PROFILE: Profile = { name: "", avatar: null };

type ProfileStore = {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
};

const ProfileContext = createContext<ProfileStore | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProfile({ ...EMPTY_PROFILE, ...JSON.parse(raw) });
      } else if (user) {
        const fullName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "";
        const avatarUrl = user.imageUrl || null;
        setProfile({ name: fullName, avatar: avatarUrl });
      }
    } catch {
      // Fallback
    }
  }, [user]);

  const updateProfile = (patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  if (!first) return "S";
  return (first + (parts[1]?.[0] ?? "")).toUpperCase();
}

