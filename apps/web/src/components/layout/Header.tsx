"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-end gap-2 p-4 border-b border-border/50">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </header>
      
      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </>
  );
}