"use client";

import PaintBoardIcon from "@hugeicons/core-free-icons/PaintBoardIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  THEMES,
  type ThemeId,
  type ThemeOption,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

const readStoredTheme = (): ThemeId => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const applyTheme = (theme: ThemeId) => {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the theme still applies.
  }
};

function Swatch({ colors }: { colors: readonly [string, string, string] }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center -space-x-1">
      {colors.map((color) => (
        <span
          className="inline-block size-3.5 rounded-full ring-1 ring-foreground/15"
          key={color}
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

function ThemeOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: ThemeOption;
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(option.id as ThemeId);
  }, [onSelect, option.id]);

  return (
    <li>
      <button
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
          selected && "bg-primary/15"
        )}
        onClick={handleClick}
        type="button"
      >
        <span className="pt-0.5">
          <Swatch colors={option.swatch} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground text-sm">
            {option.name}
          </span>
          <span className="text-muted-foreground text-xs">
            {option.description}
          </span>
        </span>
      </button>
    </li>
  );
}

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  // The inline bootstrap script in the root layout applies the stored theme
  // before paint; here we only sync React state to what's already on <html>.
  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  const handleSelect = useCallback((next: ThemeId) => {
    applyTheme(next);
    setTheme(next);
  }, []);

  const active = THEMES.find((option) => option.id === theme) ?? THEMES[0];

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label={`Theme: ${active.name}. Change theme`}
              size="sm"
              variant="outline"
            />
          }
        >
          <HugeiconsIcon data-icon="inline-start" icon={PaintBoardIcon} />
          {active.name}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64" side="top">
          <p className="px-1.5 pt-0.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Style experiments
          </p>
          <ul className="flex flex-col gap-0.5">
            {THEMES.map((option) => (
              <ThemeOptionRow
                key={option.id}
                onSelect={handleSelect}
                option={option}
                selected={option.id === theme}
              />
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
