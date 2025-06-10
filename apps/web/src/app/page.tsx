"use client";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">OrionChat</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  );
}