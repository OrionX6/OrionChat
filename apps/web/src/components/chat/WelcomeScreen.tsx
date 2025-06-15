"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button-wrapper";
import { Sparkles, Code, Lightbulb, BookOpen } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
  onNewConversation?: () => void;
  showNewChatButton?: boolean;
  conversationId?: string | null;
}

const categories = [
  {
    icon: Sparkles,
    text: "Create",
    description: "Generate ideas and content"
  },
  {
    icon: BookOpen,
    text: "Explore",
    description: "Discover new topics"
  },
  {
    icon: Code,
    text: "Code",
    description: "Write and debug programs"
  },
  {
    icon: Lightbulb,
    text: "Learn",
    description: "Understand concepts"
  }
];

const promptCollections = {
  general: [
    "How does AI work?",
    "Are black holes real?", 
    "How many R's are in the word \"Strawberry\"?",
    "What is the meaning of life?"
  ],
  create: [
    "Write a short story about time travel",
    "Generate blog post ideas for tech startups",
    "Create a business plan for an eco-friendly product",
    "Design a marketing campaign for a new app"
  ],
  explore: [
    "Research the latest developments in renewable energy",
    "Discover emerging technologies in healthcare",
    "Investigate the history of ancient civilizations",
    "Find trending topics in artificial intelligence"
  ],
  code: [
    "Debug this JavaScript function that's not working",
    "Build a React component for a todo list",
    "Optimize database queries for better performance",
    "Review my code architecture and suggest improvements"
  ],
  learn: [
    "Explain quantum physics in simple terms",
    "Teach me Python programming basics",
    "How does machine learning actually work?",
    "Help me understand blockchain technology"
  ]
};

export function WelcomeScreen({ onSuggestionClick, conversationId }: WelcomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof promptCollections>('general');
  
  // Reset to general category when conversation changes (new chat clicked)
  useEffect(() => {
    setSelectedCategory('general');
  }, [conversationId]);
  
  const getCurrentPrompts = () => {
    return promptCollections[selectedCategory];
  };

  return (
    <div className="text-center max-w-3xl w-full p-8">
        {/* Main heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-semibold mb-6 text-foreground tracking-tight">
            How can I help you?
          </h1>
        </div>

        {/* Category buttons */}
        <div className="flex justify-center gap-2 mb-12">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            const categoryKey = category.text.toLowerCase() as keyof typeof promptCollections;
            const isActive = selectedCategory === categoryKey;
            
            return (
              <Button
                key={index}
                variant={isActive ? "default" : "outline"}
                className={`h-12 px-6 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
                onClick={() => setSelectedCategory(categoryKey)}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {category.text}
              </Button>
            );
          })}
        </div>

        {/* Sample prompts */}
        <div className="max-w-lg mx-auto">
          <div className="transition-opacity duration-300 space-y-4">
            {getCurrentPrompts().map((prompt, index) => (
              <button
                key={`${selectedCategory}-${index}`}
                onClick={() => onSuggestionClick(prompt)}
                className="block w-full text-left p-4 rounded-xl border border-border/70 hover:border-border hover:bg-muted/20 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
              >
                <span className="group-hover:text-foreground transition-colors">
                  {prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
    </div>
  );
}
