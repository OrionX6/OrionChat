"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Edit3, Menu, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button-wrapper";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Database } from "@/lib/types/database";

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  loading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function Sidebar({
  conversations,
  currentConversation,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  loading = false,
  isCollapsed = false,
  onToggleCollapse,
  searchInputRef,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };


  if (isCollapsed) {
    return (
      <div className="w-12 bg-card/50 border-r border-border/50 flex flex-col h-full">
        {/* Collapsed Header */}
        <div className="p-3 border-b border-border/50">
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
            className="w-full h-10 p-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Collapsed New Chat Button */}
        <div className="p-3">
          <Button
            onClick={onNewConversation}
            variant="ghost"
            size="sm"
            className="w-full h-10 p-0"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-card/80 border-r border-border/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold">OrionChat</span>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 h-10 text-sm font-medium bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg mb-4"
          disabled={loading}
        >
          New Chat
        </Button>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search your threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-border/30 focus:border-border/60 h-9 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Section Header */}
        {filteredConversations.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Yesterday
            </h3>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted/30 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const isSelected = currentConversation?.id === conversation.id;
              const isEditing = editingId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative rounded-lg px-3 py-2 cursor-pointer transition-all duration-200",
                    isSelected
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    if (!isEditing) {
                      onConversationSelect(conversation);
                    }
                  }}
                >
                  <div className="relative w-full">
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveEdit}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <h3 className="text-sm py-1 truncate">
                          {conversation.title}
                        </h3>
                        <div className={cn(
                          "absolute right-0 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2 pl-8",
                          isSelected 
                            ? "bg-gradient-to-l from-primary/15 from-70% to-transparent" 
                            : "bg-gradient-to-l from-card from-70% to-transparent"
                        )}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(conversation);
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conversation.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Login/Account Section */}
      <div className="p-4 border-t border-border/30">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </div>
  );
}
