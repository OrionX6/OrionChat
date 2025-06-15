"use client";

import { useState } from "react";
import { Check, ChevronDown, Zap, Eye, Wrench, Search, FileText, Brain, Globe, Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AVAILABLE_MODELS, 
  ModelInfo, 
  ModelProvider
} from "@/lib/constants/models";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (provider: ModelProvider, modelName: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled = false, compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  
  const handleModelSelect = (model: ModelInfo) => {
    onModelChange(model.provider, model.name);
    setOpen(false);
  };

  const getCapabilityIcon = (type: string) => {
    switch (type) {
      case 'vision': return <Eye className="h-4 w-4" />;
      case 'websearch': return <Globe className="h-4 w-4" />;
      case 'upload': return <FileText className="h-4 w-4" />;
      case 'reasoning': return <Brain className="h-4 w-4" />;
      case 'functions': return <Wrench className="h-4 w-4" />;
      case 'premium': return <Diamond className="h-4 w-4" />;
      default: return null;
    }
  };

  const getCapabilityTooltip = (type: string) => {
    switch (type) {
      case 'vision': return 'Image upload and analysis';
      case 'websearch': return 'Web search capabilities';
      case 'upload': return 'File and document upload';
      case 'reasoning': return 'Advanced reasoning and problem solving';
      case 'functions': return 'Function calling and tools';
      case 'premium': return 'Premium model features';
      default: return '';
    }
  };

  const renderModelItem = (model: ModelInfo) => {
    const isSelected = model.id === selectedModel;
    const capabilities = [];
    
    if (model.supportsVision) capabilities.push('vision');
    if (model.supportsWebSearch) capabilities.push('websearch');
    if (model.supportsFileUpload) capabilities.push('upload');
    if (model.supportsReasoning) capabilities.push('reasoning');
    if (model.provider === 'anthropic' || model.provider === 'openai') capabilities.push('premium');
    
    return (
      <DropdownMenuItem
        key={model.id}
        onClick={() => handleModelSelect(model)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-primary/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{model.icon}</span>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{model.displayName}</span>
            {model.provider === 'deepseek' && (
              <span className="text-xs text-muted-foreground">DeepSeek</span>
            )}
          </div>
          {isSelected && <Check className="h-4 w-4 text-primary ml-2" />}
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {capabilities.map((capability) => (
              <Tooltip key={capability}>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded bg-muted/50 hover:bg-muted cursor-help">
                    {getCapabilityIcon(capability)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getCapabilityTooltip(capability)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`flex items-center gap-2 justify-between hover:bg-muted/50 ${
            compact
              ? "min-w-[140px] h-8 px-2 text-sm"
              : "min-w-[200px]"
          }`}
        >
          <div className="flex items-center gap-2">
            {!compact && <Zap className="h-4 w-4" />}
            <span className="truncate">
              {currentModel ? currentModel.displayName : 'Select Model'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[450px] max-h-[600px] overflow-y-auto bg-background border border-border">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Unlock all models + higher limits</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-pink-500">$8</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              Upgrade now
            </Button>
          </div>
        </div>
        
        <div className="py-2">
          {AVAILABLE_MODELS.map(renderModelItem)}
        </div>
        
        <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4 rotate-180" />
            <span>Show all</span>
          </div>
          <div className="p-1 rounded hover:bg-muted cursor-pointer">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
