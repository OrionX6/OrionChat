"use client";

import { useState, useEffect } from "react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const loadConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data);
    
    // If no current conversation and we have conversations, select the first one
    if (!currentConversation && data.length > 0) {
      setCurrentConversation(data[0]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data);
  };

  const createNewConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
        model_provider: 'openai',
        model_name: 'gpt-4o-mini'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return;
    }

    setConversations([data, ...conversations]);
    setCurrentConversation(data);
    setMessages([]);
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    // Create new conversation if none exists
    if (!currentConversation) {
      await createNewConversation();
      return;
    }

    setLoading(true);

    // Add user message
    const { data: userMessage, error: userError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversation.id,
        role: 'user',
        content,
        provider: currentConversation.model_provider,
        model: currentConversation.model_name
      })
      .select()
      .single();

    if (userError) {
      console.error('Error saving user message:', userError);
      setLoading(false);
      return;
    }

    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response (replace with actual AI call later)
    setTimeout(async () => {
      const { data: aiMessage, error: aiError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: `I received your message: "${content}". This is a demo response from OrionChat using ${currentConversation.model_name}!`,
          provider: currentConversation.model_provider,
          model: currentConversation.model_name
        })
        .select()
        .single();

      if (aiError) {
        console.error('Error saving AI message:', aiError);
      } else {
        setMessages(prev => [...prev, aiMessage]);
      }

      setLoading(false);
    }, 1000);
  };

  // Show welcome message if no conversations
  if (!currentConversation && conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold mb-4">Welcome to OrionChat</h2>
            <p className="text-muted-foreground mb-6">
              Start a new conversation to begin chatting with AI models.
            </p>
            <button
              onClick={createNewConversation}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Start New Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Header */}
      {currentConversation && (
        <div className="border-b px-4 py-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{currentConversation.title}</h2>
            <span className="text-xs text-muted-foreground">
              {currentConversation.model_name}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs">AI</span>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={loading} />
    </div>
  );
}