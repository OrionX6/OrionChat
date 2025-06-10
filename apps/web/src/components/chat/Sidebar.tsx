"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, MoreHorizontal, Trash2, Edit3, ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showActionsId, setShowActionsId] = useState<string | null>(null);

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

  // Close action buttons when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActionsId(null);
    };
    
    if (showActionsId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionsId]);

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
    <div className="w-64 bg-card/50 border-r border-border/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Conversations</span>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 h-11 text-sm font-medium"
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium mb-1">No conversations yet</p>
            <p className="text-xs">Start a new chat to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {conversations.map((conversation) => {
              const isSelected = currentConversation?.id === conversation.id;
              const isEditing = editingId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/30"
                  )}
                  onClick={() => {
                    if (!isEditing) {
                      setShowActionsId(null);
                      onConversationSelect(conversation);
                    }
                  }}
                >
                  <div className="flex items-center gap-1 w-full">
                    <div className="flex-1 min-w-0">
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
                        <h3 className="font-medium text-sm truncate py-1">
                          {conversation.title}
                        </h3>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        {showActionsId === conversation.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(conversation);
                                setShowActionsId(null);
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
                                setShowActionsId(null);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionsId(conversation.id);
                            }}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
