import React, { useState, useEffect } from "react";
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  Type, 
  MessageSquare, 
  Check, 
  ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";
import { Settings } from "../types";

interface AppearanceTabProps {
  settings: Settings;
  onSaveSettings: (settings: Settings) => Promise<void>;
  showSuccess?: (msg: string) => void;
  showError?: (msg: string) => void;
  onBack?: () => void;
}

export default function AppearanceTab({
  settings,
  onSaveSettings,
  showSuccess,
  showError,
  onBack
}: AppearanceTabProps) {
  // Local state for appearance options
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(
    settings.theme || (settings.isDarkMode ? 'dark' : 'light')
  );
  const [accentColor, setAccentColor] = useState<
    'auto' | 'purple' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'zinc' | 'blue'
  >(settings.accentColor || 'auto');

  // Font size: separated into applied (saved) vs pending (selected but unsaved)
  const [appliedFontSize, setAppliedFontSize] = useState<'sm' | 'md' | 'lg'>(
    (settings.fontSize as 'sm' | 'md' | 'lg') || 'md'
  );
  const [pendingFontSize, setPendingFontSize] = useState<'sm' | 'md' | 'lg'>(
    (settings.fontSize as 'sm' | 'md' | 'lg') || 'md'
  );

  const [messageDensity, setMessageDensity] = useState<'comfortable' | 'compact'>(
    (settings.messageDensity as 'comfortable' | 'compact') || 'comfortable'
  );

  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  // Keep state in sync if settings props change from outside
  useEffect(() => {
    if (settings.theme) setTheme(settings.theme);
    if (settings.accentColor) setAccentColor(settings.accentColor);
    const currFs = (settings.fontSize as 'sm' | 'md' | 'lg') || 'md';
    setAppliedFontSize(currFs);
    setPendingFontSize(currFs);
    if (settings.messageDensity) setMessageDensity((settings.messageDensity as 'comfortable' | 'compact') || 'comfortable');
  }, [settings]);

  // Helper to trigger save
  const saveState = async (updatedPartial: Partial<Settings>) => {
    const nextTheme = updatedPartial.theme ?? theme;
    const nextAccent = updatedPartial.accentColor ?? accentColor;
    const nextFontSize = updatedPartial.fontSize ?? appliedFontSize;
    const nextDensity = updatedPartial.messageDensity ?? messageDensity;

    // Local UI feedback state
    if (updatedPartial.theme !== undefined) setTheme(updatedPartial.theme as any);
    if (updatedPartial.accentColor !== undefined) setAccentColor(updatedPartial.accentColor as any);
    if (updatedPartial.fontSize !== undefined) {
      setAppliedFontSize(updatedPartial.fontSize as any);
      setPendingFontSize(updatedPartial.fontSize as any);
    }
    if (updatedPartial.messageDensity !== undefined) setMessageDensity(updatedPartial.messageDensity as any);

    const isDark =
      nextTheme === 'dark' ||
      (nextTheme === 'system'
        ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        : false);

    const newSettings: Settings = {
      ...settings,
      theme: nextTheme,
      isDarkMode: isDark,
      accentColor: nextAccent,
      fontSize: nextFontSize,
      messageDensity: nextDensity,
      showChatMetadata: false,
    };

    setSavingStatus("Saving...");
    try {
      await onSaveSettings(newSettings);
      setSavingStatus("Saved");
      setTimeout(() => setSavingStatus(null), 1800);
    } catch (err) {
      setSavingStatus("Error saving");
      showError?.("Failed to save appearance settings");
    }
  };

  return (
    <motion.div
      key="tab-appearance-page"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 max-w-3xl mx-auto pb-10"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Back to Settings"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Appearance Settings</h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Customize the look, feel, and typography of your workspace.
            </p>
          </div>
        </div>

        {savingStatus && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start sm:self-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{savingStatus}</span>
          </div>
        )}
      </div>

      {/* 1. THEME */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-sm dark:shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Theme</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Choose your preferred display theme across the application.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'system',
              title: 'System',
              desc: 'Syncs with device OS theme',
              icon: Monitor,
            },
            {
              id: 'light',
              title: 'Light',
              desc: 'Clean bright layout',
              icon: Sun,
            },
            {
              id: 'dark',
              title: 'Dark',
              desc: 'Deep dark canvas & contrast',
              icon: Moon,
            }
          ].map((t) => {
            const IconComp = t.icon;
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => saveState({ theme: t.id as any })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 relative ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-white ring-1 ring-sky-500/40 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 p-1 rounded-full bg-sky-500 text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500/20 text-sky-500 dark:text-sky-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{t.title}</h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{t.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ACCENT COLOR */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-sm dark:shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-500" />
            <span>Accent Color</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Select the primary highlight color for buttons, active tabs, and focus states.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2.5">
          {[
            { id: 'auto', name: 'Auto Default', bgClass: 'bg-sky-400' },
            { id: 'cyan', name: 'Neon Cyan', bgClass: 'bg-cyan-400' },
            { id: 'purple', name: 'Purple', bgClass: 'bg-purple-500' },
            { id: 'emerald', name: 'Emerald', bgClass: 'bg-emerald-500' },
            { id: 'amber', name: 'Amber', bgClass: 'bg-amber-500' },
            { id: 'rose', name: 'Rose', bgClass: 'bg-rose-500' },
            { id: 'indigo', name: 'Indigo', bgClass: 'bg-indigo-500' },
            { id: 'blue', name: 'Royal Blue', bgClass: 'bg-blue-500' },
            { id: 'zinc', name: 'Monochromatic', bgClass: 'bg-zinc-400' }
          ].map((col) => {
            const isSelected = accentColor === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => saveState({ accentColor: col.id as any })}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-900 dark:border-white/60 text-zinc-900 dark:text-white font-semibold ring-1 ring-zinc-400 dark:ring-white/20'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${col.bgClass} shrink-0 shadow-sm`} />
                  <span className="text-xs font-semibold">{col.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-500 dark:text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FONT SIZE - SAVED ONLY UPON EXPLICIT ACTION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-sm dark:shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>Font Size</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select font size below and click Save to apply changes.
            </p>
          </div>

          {pendingFontSize !== appliedFontSize && (
            <button
              type="button"
              onClick={() => saveState({ fontSize: pendingFontSize })}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Save Font Size</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'sm', label: 'Small' },
            { id: 'md', label: 'Medium' },
            { id: 'lg', label: 'Large' }
          ].map((s) => {
            const isPendingSelected = pendingFontSize === s.id;
            const isApplied = appliedFontSize === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setPendingFontSize(s.id as any)}
                className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center relative ${
                  isPendingSelected
                    ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-white ring-1 ring-sky-500/30'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span>{s.label}</span>
                {isApplied && (
                  <span className="block text-[9px] font-normal text-emerald-500 dark:text-emerald-400 mt-0.5">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Font Size Sample */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Text Preview:</span>
          <p className={`text-zinc-800 dark:text-zinc-200 transition-all ${
            pendingFontSize === 'sm' ? 'text-xs' :
            pendingFontSize === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            The quick brown fox jumps over the lazy dog. Hello from A-NOVA Studio!
          </p>
        </div>
      </div>

      {/* 4. CHAT DENSITY */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-sm dark:shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-500" />
            <span>Chat Density</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Adjust message padding and vertical spacing in conversation threads.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'comfortable', label: 'Comfortable', desc: 'Standard spacing & padding' },
            { id: 'compact', label: 'Compact', desc: 'Tighter padding for maximum content' }
          ].map((d) => {
            const isSelected = messageDensity === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => saveState({ messageDensity: d.id as any })}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-1 ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-white ring-1 ring-sky-500/30'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{d.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-500" />}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{d.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Live Density Preview */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className={`p-2 bg-zinc-200 dark:bg-zinc-900 rounded-lg text-[11px] text-zinc-800 dark:text-zinc-300 ${
            messageDensity === 'compact' ? 'py-1 my-0.5' : 'py-2.5 my-1.5'
          }`}>
            Assistant: How can I help you today?
          </div>
          <div className={`p-2 bg-sky-500/10 text-sky-900 dark:text-sky-300 rounded-lg text-[11px] ${
            messageDensity === 'compact' ? 'py-1 my-0.5' : 'py-2.5 my-1.5'
          }`}>
            User: Simplify the settings menu layout.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
