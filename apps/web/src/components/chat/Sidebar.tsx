"use client";

import { useState } from "react";
import { Plus, MessageSquare, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";
import { getModelById } from "@/lib/constants/models";

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  loading?: boolean;
}

export function Sidebar({
  conversations,
  currentConversation,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  loading = false,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-80 bg-card/50 border-r border-border/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
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
              const model = getModelById(conversation.model_name);

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative rounded-xl p-4 cursor-pointer transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : "hover:bg-muted/30 hover:shadow-sm"
                  )}
                  onClick={() => !isEditing && onConversationSelect(conversation)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleSaveEdit}
                          className="h-6 text-sm"
                          autoFocus
                        />
                      ) : (
                        <h3 className="font-medium text-sm truncate">
                          {conversation.title}
                        </h3>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conversation.updated_at)}
                        </span>
                        {model && (
                          <Badge variant="secondary" className="text-xs">
                            {model.displayName}
                          </Badge>
                        )}
                      </div>
                      
                      {conversation.message_count && conversation.message_count > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {conversation.message_count} messages
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleStartEdit(conversation);
                            }}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onDeleteConversation(conversation.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
