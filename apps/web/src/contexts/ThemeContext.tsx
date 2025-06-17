"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ColorTheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'rose';
export type BaseTheme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  baseTheme: BaseTheme;
  colorTheme: ColorTheme;
  setBaseTheme: (theme: BaseTheme) => void;
  setColorTheme: (theme: ColorTheme) => void;
  resolvedTheme: 'light' | 'dark';
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultBaseTheme?: BaseTheme;
  defaultColorTheme?: ColorTheme;
}

export function ThemeProvider({ 
  children, 
  defaultBaseTheme = 'system',
  defaultColorTheme = 'default'
}: ThemeProviderProps) {
  // Initialize with localStorage values if available to prevent flash
  const getInitialBaseTheme = (): BaseTheme => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('base-theme') as BaseTheme;
      return stored || defaultBaseTheme;
    }
    return defaultBaseTheme;
  };

  const getInitialColorTheme = (): ColorTheme => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('color-theme') as ColorTheme;
      return stored || defaultColorTheme;
    }
    return defaultColorTheme;
  };

  const [baseTheme, setBaseThemeState] = useState<BaseTheme>(getInitialBaseTheme);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(getInitialColorTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load settings from database when component mounts
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('base_theme, color_theme')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            const dbBaseTheme = (data.base_theme as BaseTheme) || 'system';
            const dbColorTheme = (data.color_theme as ColorTheme) || 'default';
            
            // Only update if different from current values to avoid unnecessary re-renders
            if (dbBaseTheme !== baseTheme) setBaseThemeState(dbBaseTheme);
            if (dbColorTheme !== colorTheme) setColorThemeState(dbColorTheme);
          }
        }
      } catch (error) {
        console.error('Error loading settings from database:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [supabase, baseTheme, colorTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    root.classList.remove('theme-default', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-lavender', 'theme-rose');
    
    // Determine resolved theme
    let resolved: 'light' | 'dark' = 'dark';
    if (baseTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = baseTheme;
    }
    
    setResolvedTheme(resolved);
    
    // Apply base theme
    root.classList.add(resolved);
    
    // Apply color theme
    root.classList.add(`theme-${colorTheme}`);
    
    // Store in localStorage as backup
    localStorage.setItem('base-theme', baseTheme);
    localStorage.setItem('color-theme', colorTheme);
  }, [baseTheme, colorTheme]);

  // Save to database when themes change
  const saveToDatabase = async (base?: BaseTheme, color?: ColorTheme) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = { updated_at: new Date().toISOString() };
      if (base) updateData.base_theme = base;
      if (color) updateData.color_theme = color;

      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          ...updateData
        });
    } catch (error) {
      console.error('Error saving theme to database:', error);
    }
  };

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (baseTheme === 'system') {
        const resolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [baseTheme]);

  const setBaseTheme = (theme: BaseTheme) => {
    setBaseThemeState(theme);
    saveToDatabase(theme, undefined);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    saveToDatabase(undefined, theme);
  };

  const value = {
    baseTheme,
    colorTheme,
    setBaseTheme,
    setColorTheme,
    resolvedTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
