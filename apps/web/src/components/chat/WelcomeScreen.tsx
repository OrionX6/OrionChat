"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Code, Lightbulb, BookOpen } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
  onNewConversation?: () => void;
  showNewChatButton?: boolean;
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

const samplePrompts = [
  "How does AI work?",
  "Are black holes real?", 
  "How many R's are in the word \"Strawberry\"?",
  "What is the meaning of life?"
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-3xl w-full">
        {/* Main heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-semibold mb-6 text-foreground tracking-tight">
            How can I help you?
          </h1>
        </div>

        {/* Category buttons */}
        <div className="flex justify-center gap-3 mb-12">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-12 px-6 rounded-xl border-border/30 hover:border-border hover:bg-muted/30 transition-all duration-200"
                onClick={() => onSuggestionClick(`Help me ${category.text.toLowerCase()}`)}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {category.text}
              </Button>
            );
          })}
        </div>

        {/* Sample prompts */}
        <div className="space-y-3 max-w-lg mx-auto">
          {samplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(prompt)}
              className="block w-full text-left p-4 rounded-xl border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
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
