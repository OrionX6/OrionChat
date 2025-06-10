"use client";

import { useState } from "react";
import { Check, ChevronDown, Zap, Eye, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  AVAILABLE_MODELS, 
  MODELS_BY_PROVIDER, 
  ModelInfo, 
  ModelProvider,
  formatCostDisplay 
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

  const renderModelItem = (model: ModelInfo) => {
    const isSelected = model.id === selectedModel;
    
    return (
      <DropdownMenuItem
        key={model.id}
        onClick={() => handleModelSelect(model)}
        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-medium">{model.displayName}</span>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex items-center gap-1">
            {model.supportsFunctions && (
              <Badge variant="secondary" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                Functions
              </Badge>
            )}
            {model.supportsVision && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Vision
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <span>{model.description}</span>
          <span className="font-mono">{formatCostDisplay(model)}</span>
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
              {currentModel ? (compact ? currentModel.displayName.split(' ')[0] + (currentModel.displayName.includes('Flash') ? ' Flash' : '') : currentModel.displayName) : 'Select Model'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[400px] max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Choose Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* OpenAI Models */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          OpenAI
        </DropdownMenuLabel>
        {MODELS_BY_PROVIDER.openai.map(renderModelItem)}
        
        <DropdownMenuSeparator />
        
        {/* Anthropic Models */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Anthropic
        </DropdownMenuLabel>
        {MODELS_BY_PROVIDER.anthropic.map(renderModelItem)}
        
        <DropdownMenuSeparator />
        
        {/* Google Models */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Google
        </DropdownMenuLabel>
        {MODELS_BY_PROVIDER.google.map(renderModelItem)}
        
        <DropdownMenuSeparator />
        
        {/* DeepSeek Models */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          DeepSeek
        </DropdownMenuLabel>
        {MODELS_BY_PROVIDER.deepseek.map(renderModelItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
