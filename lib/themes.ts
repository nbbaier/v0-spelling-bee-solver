export const THEME_STORAGE_KEY = "sb-theme";

export interface ThemeOption {
  description: string;
  id: string;
  name: string;
  /** Static preview colors for the picker: [background, primary, foreground]. */
  swatch: readonly [string, string, string];
}

export const THEMES = [
  {
    description: "The current look. Warm neutrals, honey accent.",
    id: "base",
    name: "Base Honey",
    swatch: ["#fbfaf7", "#f0c34a", "#39362f"],
  },
  {
    description: "Editorial. Paper background, serif headings, vermilion ink.",
    id: "ink",
    name: "Base Ink",
    swatch: ["#f5f1e8", "#c9482a", "#2a241c"],
  },
  {
    description: "Honey colors, 0.5rem radius, Ink typography and flat cards.",
    id: "honey-ink-1",
    name: "Honey Ink 1",
    swatch: ["#fbfaf7", "#f0c34a", "#2a241c"],
  },
  {
    description: "Honey colors, 0.5rem radius, Honey typography, flat cards.",
    id: "honey-ink-2",
    name: "Honey Ink 2",
    swatch: ["#fbfaf7", "#f0c34a", "#39362f"],
  },
] as const satisfies readonly ThemeOption[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "base";

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && THEMES.some((theme) => theme.id === value);
