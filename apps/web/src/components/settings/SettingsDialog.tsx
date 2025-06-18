"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMessageUsage } from "@/hooks/useMessageUsage";
import { useTheme, type ColorTheme, type BaseTheme } from "@/contexts/ThemeContext";
import { useFont, type FontFamily } from "@/contexts/FontContext";
import { useEnabledModels } from "@/contexts/EnabledModelsContext";
import { AVAILABLE_MODELS } from "@/lib/constants/models";
import { useDefaultModel } from "@/hooks/useDefaultModel";
import { useUserAttachments } from "@/hooks/useUserAttachments";
import {
  User,
  Palette,
  Zap,
  Link,
  Contact,
  BarChart3,
  Keyboard,
  Trash2,
  ExternalLink,
  Check
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useAuth();
  const { usage, loading: usageLoading } = useMessageUsage();
  const { baseTheme, colorTheme, setBaseTheme, setColorTheme } = useTheme();
  const { fontFamily, setFontFamily } = useFont();
  const { isModelEnabled, toggleModel, enabledModels, getEnabledModels } = useEnabledModels();
  const { defaultModelName, setDefaultModel } = useDefaultModel();
  const { 
    attachments, 
    loading: attachmentsLoading, 
    selectedCount, 
    isSelected, 
    isAllSelected, 
    toggleSelection, 
    selectAll, 
    clearSelection, 
    deleteAttachment, 
    deleteAttachments, 
    formatFileSize, 
    getFileIcon 
  } = useUserAttachments();
  const [activeTab, setActiveTab] = useState("account");
  
  // Mock user data - in real app, this would come from your user profile service
  const [userProfile, setUserProfile] = useState({
    name: user?.user_metadata?.full_name || "Nathan Johns",
    email: user?.email || "orion0508@gmail.com",
    about: "Engineer, student, etc.",
    interests: "Interests, values, or preferences to keep in mind"
  });


  const [shortcuts] = useState([
    { action: "Search", shortcut: "⌘ K" },
    { action: "New Chat", shortcut: "⌘ Shift O" },
    { action: "Toggle Sidebar", shortcut: "⌘ B" }
  ]);

  // Helper function to get model styling
  const getModelStyling = (modelId: string) => {
    switch (modelId) {
      case 'gpt-4o-mini':
        return {
          gradient: 'from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10',
          dotColor: 'bg-green-500',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          badgeText: 'Fast'
        };
      case 'claude-3-5-haiku-20241022':
        return {
          gradient: 'from-orange-50 to-red-50 dark:from-orange-950/10 dark:to-red-950/10',
          dotColor: 'bg-orange-500',
          badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          badgeText: 'Balanced'
        };
      case 'gemini-2.0-flash-exp':
        return {
          gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/10 dark:to-cyan-950/10',
          dotColor: 'bg-blue-500',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          badgeText: 'Multimodal'
        };
      case 'gemini-2.5-flash-preview-05-20':
        return {
          gradient: 'from-indigo-50 to-purple-50 dark:from-indigo-950/10 dark:to-purple-950/10',
          dotColor: 'bg-indigo-500',
          badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
          badgeText: 'Advanced'
        };
      case 'deepseek-reasoner':
        return {
          gradient: 'from-purple-50 to-violet-50 dark:from-purple-950/10 dark:to-violet-950/10',
          dotColor: 'bg-purple-500',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          badgeText: 'Reasoning'
        };
      default:
        return {
          gradient: 'from-gray-50 to-slate-50 dark:from-gray-950/10 dark:to-slate-950/10',
          dotColor: 'bg-gray-500',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          badgeText: 'Model'
        };
    }
  };

  // Helper function to get model capability badges
  const getModelBadges = (model: typeof AVAILABLE_MODELS[0]) => {
    const badges = [];
    if (model.supportsVision) badges.push('Vision');
    if (model.supportsWebSearch) badges.push('Web Search');
    if (model.supportsFileUpload) badges.push('PDF Support');
    if (model.supportsReasoning) badges.push('Chain of Thought');
    if (model.supportsFunctions) badges.push('Functions');
    
    // Add specific badges based on model
    switch (model.id) {
      case 'gpt-4o-mini':
        badges.push('Code Generation');
        break;
      case 'claude-3-5-haiku-20241022':
        badges.push('Analysis', 'Writing');
        break;
      case 'gemini-2.0-flash-exp':
      case 'gemini-2.5-flash-preview-05-20':
        badges.push('1M Context');
        break;
      case 'deepseek-reasoner':
        badges.push('Math & Logic', 'Cost Effective');
        break;
    }
    
    return badges;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 bg-background border shadow-2xl flex flex-col">
        <DialogHeader className="px-8 py-6 border-b bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage your account, preferences, and application settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex">
            <div className="w-72 border-r bg-muted/30 p-6 flex-shrink-0">
              <TabsList className="flex-col h-auto bg-transparent p-0 space-y-2 w-full">
                <TabsTrigger 
                  value="account" 
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <User className="h-5 w-5" />
                  Account
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <Palette className="h-5 w-5" />
                  Theme & Appearance
                </TabsTrigger>
                <TabsTrigger 
                  value="models" 
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <Zap className="h-5 w-5" />
                  Models
                </TabsTrigger>
                <TabsTrigger 
                  value="attachments" 
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <Link className="h-5 w-5" />
                  Attachments
                </TabsTrigger>
                <TabsTrigger 
                  value="contact" 
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <Contact className="h-5 w-5" />
                  Contact Us
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-w-0">
              <TabsContent value="account" className="m-0 p-8">
                <div className="space-y-8">
                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border">
                    <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                        {userProfile.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">{userProfile.name}</h3>
                      <p className="text-muted-foreground">{userProfile.email}</p>
                      <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary border-primary/20">
                        Pro Plan
                      </Badge>
                    </div>
                  </div>

                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Settings
                      </CardTitle>
                      <CardDescription>
                        Manage your personal information and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-base font-medium">What should OrionChat call you?</Label>
                        <Input
                          id="name"
                          value={userProfile.name}
                          onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your name"
                          className="h-12 text-base border-2 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">{userProfile.name.length}/50</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Message Usage
                      </CardTitle>
                      <CardDescription>
                        {usageLoading ? 'Loading...' : `Resets ${usage.resetDate.toLocaleDateString()}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      {usageLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Monthly Messages</span>
                              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {usage.used}/{usage.limit}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  usage.isAtLimit
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : usage.used / usage.limit > 0.8
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {usage.limit - usage.used} messages remaining
                              </span>
                              <span className="text-muted-foreground">
                                Resets in {usage.daysUntilReset} days
                              </span>
                            </div>
                          </div>

                          {usage.isAtLimit && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700 rounded-lg">
                              <p className="text-sm text-red-900 dark:text-red-100">
                                ⚠️ You've reached your monthly message limit. You can send more messages after your limit resets in {usage.daysUntilReset} days.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {shortcuts.map((shortcut, index) => (
                          <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <span className="font-medium">{shortcut.action}</span>
                            <Badge variant="outline" className="font-mono text-xs bg-background">
                              {shortcut.shortcut}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="m-0 p-8">
                <div className="space-y-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Theme & Appearance
                      </CardTitle>
                      <CardDescription>
                        Customize the visual appearance of OrionChat
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Base Theme</Label>
                            <p className="text-sm text-muted-foreground">
                              Choose between light, dark, or system preference
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {(['light', 'dark', 'system'] as BaseTheme[]).map((theme) => (
                              <button
                                key={theme}
                                onClick={() => setBaseTheme(theme)}
                                className={`p-4 border rounded-lg transition-all ${
                                  baseTheme === theme
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className="text-sm font-medium capitalize">{theme}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {theme === 'light' && 'Always light'}
                                  {theme === 'dark' && 'Always dark'}
                                  {theme === 'system' && 'Follow system'}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Color Theme</Label>
                            <p className="text-sm text-muted-foreground">
                              Choose your preferred color scheme
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {([
                              { name: 'default', label: 'Default', colors: ['bg-blue-500', 'bg-slate-600'] },
                              { name: 'ocean', label: 'Ocean', colors: ['bg-cyan-500', 'bg-blue-600'] },
                              { name: 'forest', label: 'Forest', colors: ['bg-green-500', 'bg-emerald-600'] },
                              { name: 'sunset', label: 'Sunset', colors: ['bg-orange-500', 'bg-red-500'] },
                              { name: 'lavender', label: 'Lavender', colors: ['bg-purple-500', 'bg-violet-600'] },
                              { name: 'rose', label: 'Rose', colors: ['bg-pink-500', 'bg-rose-600'] }
                            ] as Array<{name: ColorTheme, label: string, colors: string[]}>).map((theme) => (
                              <button
                                key={theme.name}
                                onClick={() => setColorTheme(theme.name)}
                                className={`p-4 border rounded-lg transition-all ${
                                  colorTheme === theme.name
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1">
                                    {theme.colors.map((color, i) => (
                                      <div key={i} className={`w-4 h-4 rounded-full ${color}`} />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium">{theme.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Main Text Font</Label>
                            <p className="text-sm text-muted-foreground">
                              Choose your preferred font for reading messages
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {([
                              { name: 'sans', label: 'Geist Sans', preview: 'Modern and clean', previewClass: 'font-preview-sans' },
                              { name: 'serif', label: 'Serif', preview: 'Traditional and elegant', previewClass: 'font-preview-serif' },
                              { name: 'mono', label: 'JetBrains Mono', preview: 'Code-friendly spacing', previewClass: 'font-preview-mono' },
                              { name: 'playfair', label: 'Playfair Display', preview: 'Elegant and sophisticated', previewClass: 'font-preview-playfair' },
                              { name: 'poppins', label: 'Poppins', preview: 'Geometric and friendly', previewClass: 'font-preview-poppins' },
                              { name: 'crimson', label: 'Crimson Text', preview: 'Literary and readable', previewClass: 'font-preview-crimson' }
                            ] as Array<{name: FontFamily, label: string, preview: string, previewClass: string}>).map((font) => (
                              <button
                                key={font.name}
                                onClick={() => setFontFamily(font.name)}
                                className={`p-4 border rounded-lg transition-all text-left ${
                                  fontFamily === font.name
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className={`text-lg font-medium mb-1 ${font.previewClass}`}>
                                  Aa
                                </div>
                                <div className={`text-sm font-medium ${font.previewClass}`}>
                                  {font.label}
                                </div>
                                <div className={`text-xs text-muted-foreground ${font.previewClass}`}>
                                  {font.preview}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/50">
                        <div className="text-center text-sm text-muted-foreground">
                          Settings are automatically saved as you change them
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>


              <TabsContent value="models" className="m-0 p-8">
                <div className="space-y-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Available Models
                      </CardTitle>
                      <CardDescription>
                        Manage your AI model preferences and capabilities
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                      <div className="space-y-6">
                        {/* Default Model Selection */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-lg font-semibold mb-2">Default Model</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Choose which model to use by default when starting new conversations
                            </p>
                          </div>
                          <div className="grid gap-3">
                            {getEnabledModels().map((model) => (
                              <div
                                key={model.id}
                                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${
                                  defaultModelName === model.name
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border'
                                }`}
                                onClick={() => setDefaultModel(model.name)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                                    defaultModelName === model.name
                                      ? 'border-primary bg-primary'
                                      : 'border-muted-foreground'
                                  }`}>
                                    {defaultModelName === model.name && (
                                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{model.icon}</span>
                                      <span className="font-medium">{model.displayName}</span>
                                      {defaultModelName === model.name && (
                                        <Badge variant="secondary" className="text-xs">Default</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {model.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Model Toggle Section */}
                        <div className="border-t pt-6">
                          <div className="mb-4">
                            <h4 className="text-lg font-semibold mb-2">Available Models</h4>
                            <p className="text-sm text-muted-foreground">
                              Toggle models on/off to customize your model picker
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4">
                          {AVAILABLE_MODELS.map((model) => {
                            const styling = getModelStyling(model.id);
                            const badges = getModelBadges(model);
                            
                            return (
                              <div key={model.id} className={`group relative overflow-hidden rounded-xl border bg-gradient-to-r ${styling.gradient} p-6 hover:shadow-md transition-all`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={`w-3 h-3 rounded-full ${styling.dotColor}`}></div>
                                      <h4 className="text-lg font-semibold">{model.displayName}</h4>
                                      <Badge className={styling.badgeColor}>
                                        {styling.badgeText}
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground mb-3">{model.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {badges.map((badge) => (
                                        <Badge key={badge} variant="outline" className="text-xs">{badge}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <Switch 
                                    checked={isModelEnabled(model.id)}
                                    onCheckedChange={() => toggleModel(model.id)}
                                    disabled={isModelEnabled(model.id) && enabledModels.size === 1}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>


              <TabsContent value="attachments" className="m-0 p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Attachments</h2>
                    <p className="text-muted-foreground mt-2">
                      Manage your uploaded files and attachments. Note that deleting files here will remove them from the relevant threads, but not delete the threads. This may lead to unexpected behavior if you delete a file that is still being used in a thread.
                    </p>
                  </div>

                  {/* Selection Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={isAllSelected ? clearSelection : selectAll}
                          className="w-4 h-4 rounded border-2 border-muted-foreground focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </label>
                      {selectedCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                    {selectedCount > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteAttachments}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Selected ({selectedCount})
                      </Button>
                    )}
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {attachmentsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-muted-foreground">Loading attachments...</p>
                        </div>
                      </div>
                    ) : attachments.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Link className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">No attachments found</p>
                          <p className="text-sm text-muted-foreground/70">Files you upload will appear here</p>
                        </div>
                      </div>
                    ) : (
                      attachments.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors ${
                            isSelected(file.id) ? 'bg-primary/5 border-primary/20' : 'bg-background'
                          }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected(file.id)}
                            onChange={() => toggleSelection(file.id)}
                            className="w-4 h-4 rounded border-2 border-muted-foreground focus:ring-2 focus:ring-primary"
                          />

                          {/* File Icon */}
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50">
                            <span className="text-lg">{getFileIcon(file.mime_type)}</span>
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{file.original_name}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
                                onClick={() => {
                                  // Open file in new tab - you'll need to implement the URL generation
                                  // based on your storage setup (Supabase storage URL)
                                  window.open(`/api/files/${file.id}`, '_blank');
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{file.mime_type}</span>
                              <span>•</span>
                              <span>{formatFileSize(file.file_size)}</span>
                              {file.created_at && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Individual Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAttachment(file.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="m-0 p-8">
                <div className="space-y-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Contact className="h-5 w-5" />
                        Contact Us
                      </CardTitle>
                      <CardDescription>
                        Get help or provide feedback about OrionChat
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Message</Label>
                          <Textarea 
                            placeholder="Tell us about your experience, report an issue, or suggest a feature..."
                            className="min-h-[140px] text-base border-2 focus:border-primary resize-none"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Email (optional)</Label>
                          <Input 
                            type="email" 
                            placeholder="your.email@example.com"
                            defaultValue={userProfile.email}
                            className="h-12 text-base border-2 focus:border-primary"
                          />
                        </div>
                        <Button className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                          Send Message
                        </Button>
                      </div>
                      
                      <div className="pt-6 border-t border-border/50">
                        <h4 className="font-semibold mb-4 text-lg">Other Ways to Reach Us</h4>
                        <div className="grid gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div>
                              <p className="font-medium">Email</p>
                              <p className="text-sm text-muted-foreground">support@orionchat.ai</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <div>
                              <p className="font-medium">GitHub</p>
                              <p className="text-sm text-muted-foreground">github.com/orion-chat/issues</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <div>
                              <p className="font-medium">Documentation</p>
                              <p className="text-sm text-muted-foreground">docs.orionchat.ai</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}