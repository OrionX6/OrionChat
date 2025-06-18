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
import {
  User,
  Palette,
  Zap,
  Key,
  Link,
  Contact,
  Eye,
  BarChart3,
  Keyboard
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
                  value="api-keys" 
                  className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
                >
                  <Key className="h-5 w-5" />
                  API Keys
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
                        <div className="grid gap-4">
                          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10 p-6 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  <h4 className="text-lg font-semibold">GPT-4o Mini</h4>
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Fast
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-3">Fast and efficient OpenAI model for everyday tasks</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">Vision</Badge>
                                  <Badge variant="outline" className="text-xs">PDF Support</Badge>
                                  <Badge variant="outline" className="text-xs">Code Generation</Badge>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/10 dark:to-red-950/10 p-6 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                  <h4 className="text-lg font-semibold">Claude 3.5 Haiku</h4>
                                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                    Balanced
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-3">Anthropic's vision-capable model with advanced reasoning</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">Vision</Badge>
                                  <Badge variant="outline" className="text-xs">PDF Support</Badge>
                                  <Badge variant="outline" className="text-xs">Analysis</Badge>
                                  <Badge variant="outline" className="text-xs">Writing</Badge>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/10 dark:to-cyan-950/10 p-6 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <h4 className="text-lg font-semibold">Gemini 2.0 Flash</h4>
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Multimodal
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-3">Google's workhorse model with 1M context and multimodal I/O</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">Web Search</Badge>
                                  <Badge variant="outline" className="text-xs">PDF Support</Badge>
                                  <Badge variant="outline" className="text-xs">Vision</Badge>
                                  <Badge variant="outline" className="text-xs">1M Context</Badge>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/10 dark:to-purple-950/10 p-6 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                  <h4 className="text-lg font-semibold">Gemini 2.5 Flash</h4>
                                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                    Advanced
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-3">Google's advanced model with enhanced capabilities and web search</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">Web Search</Badge>
                                  <Badge variant="outline" className="text-xs">PDF Support</Badge>
                                  <Badge variant="outline" className="text-xs">Vision</Badge>
                                  <Badge variant="outline" className="text-xs">1M Context</Badge>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/10 dark:to-violet-950/10 p-6 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                  <h4 className="text-lg font-semibold">DeepSeek R1</h4>
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    Reasoning
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-3">Advanced reasoning model for complex problem solving</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">Chain of Thought</Badge>
                                  <Badge variant="outline" className="text-xs">Math & Logic</Badge>
                                  <Badge variant="outline" className="text-xs">Cost Effective</Badge>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="api-keys" className="m-0 p-8">
                <div className="space-y-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Keys
                      </CardTitle>
                      <CardDescription>
                        Securely manage your API keys for different AI providers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <p className="text-sm text-amber-900 dark:text-amber-100">
                          🔒 Your API keys are encrypted and stored securely. They are only used to make requests to the respective AI providers.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            OpenAI API Key
                          </Label>
                          <div className="flex gap-3">
                            <Input 
                              type="password" 
                              placeholder="sk-..." 
                              className="flex-1 h-12 text-base border-2 focus:border-primary"
                            />
                            <Button variant="outline" size="lg" className="px-4">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for GPT-4o Mini. Get your key from platform.openai.com
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            Anthropic API Key
                          </Label>
                          <div className="flex gap-3">
                            <Input 
                              type="password" 
                              placeholder="sk-ant-..." 
                              className="flex-1 h-12 text-base border-2 focus:border-primary"
                            />
                            <Button variant="outline" size="lg" className="px-4">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for Claude 3.5 Haiku. Get your key from console.anthropic.com
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            Google AI API Key
                          </Label>
                          <div className="flex gap-3">
                            <Input 
                              type="password" 
                              placeholder="AIza..." 
                              className="flex-1 h-12 text-base border-2 focus:border-primary"
                            />
                            <Button variant="outline" size="lg" className="px-4">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for Gemini models. Get your key from aistudio.google.com
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            DeepSeek API Key
                          </Label>
                          <div className="flex gap-3">
                            <Input 
                              type="password" 
                              placeholder="sk-..." 
                              className="flex-1 h-12 text-base border-2 focus:border-primary"
                            />
                            <Button variant="outline" size="lg" className="px-4">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Required for DeepSeek R1. Get your key from platform.deepseek.com
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/50">
                        <Button className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                          Save API Keys
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="m-0 p-8">
                <div className="space-y-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        Attachments
                      </CardTitle>
                      <CardDescription>
                        Configure file upload and attachment settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                      <div className="flex items-start justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/40 hover:to-muted/20 transition-all">
                        <div className="flex-1">
                          <Label className="text-base font-medium">Enable File Uploads</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Allow uploading images and PDFs to conversations
                          </p>
                        </div>
                        <Switch defaultChecked className="ml-4" />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Maximum File Size (MB)</Label>
                          <Input 
                            type="number" 
                            defaultValue="32" 
                            className="h-12 text-base border-2 focus:border-primary"
                          />
                          <p className="text-xs text-muted-foreground">
                            Files larger than this size will be rejected during upload
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium">Allowed File Types</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-700">
                              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Images</h4>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs border-green-300 dark:border-green-600 text-green-800 dark:text-green-200">PNG</Badge>
                                <Badge variant="outline" className="text-xs border-green-300 dark:border-green-600 text-green-800 dark:text-green-200">JPG</Badge>
                                <Badge variant="outline" className="text-xs border-green-300 dark:border-green-600 text-green-800 dark:text-green-200">WebP</Badge>
                                <Badge variant="outline" className="text-xs border-green-300 dark:border-green-600 text-green-800 dark:text-green-200">GIF</Badge>
                              </div>
                            </div>
                            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700">
                              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Documents</h4>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200">PDF</Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            📎 Supported features: Vision analysis for images, text extraction and Q&A for PDFs
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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