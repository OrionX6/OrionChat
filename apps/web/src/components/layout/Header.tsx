"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  return (
    <header className="flex items-center justify-end gap-2 p-4 border-b border-border/50">
      <ThemeToggle />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => {
          // TODO: Open settings modal
          console.log("Settings clicked");
        }}
      >
        <Settings className="h-4 w-4" />
      </Button>
    </header>
  );
}