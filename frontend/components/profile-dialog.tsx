"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialsOf, useProfile } from "@/lib/profile";

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, updateProfile } = useProfile();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(profile.name);
      setAvatar(profile.avatar);
    }
  }, [open, profile]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateProfile({ name: name.trim(), avatar });
    toast.success("Profile updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your profile</DialogTitle>
          <DialogDescription>
            Shows in the sidebar and on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16 rounded-2xl">
              {avatar && <AvatarImage src={avatar} alt="Profile photo" />}
              <AvatarFallback className="rounded-2xl bg-primary font-display text-xl text-primary-foreground">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              aria-label="Upload profile photo"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => fileRef.current?.click()}
            >
              Upload photo
            </Button>
            {avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => setAvatar(null)}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
        </div>

        <DialogFooter>
          <Button type="button" className="w-full rounded-full" onClick={save}>
            Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

