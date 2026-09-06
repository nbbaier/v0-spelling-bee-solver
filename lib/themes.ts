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
    name: "Honey",
    swatch: ["#fbfaf7", "#f0c34a", "#39362f"],
  },
  {
    description: "Editorial. Paper background, serif headings, vermilion ink.",
    id: "ink",
    name: "Ink",
    swatch: ["#f5f1e8", "#c9482a", "#2a241c"],
  },
  {
    description: "Cool and modern. Indigo accent, soft rounded surfaces.",
    id: "slate",
    name: "Slate",
    swatch: ["#f5f6fa", "#5b5bd6", "#2b2f45"],
  },
  {
    description: "Terminal. Monospace everywhere, hard edges, acid accent.",
    id: "mono",
    name: "Mono",
    swatch: ["#fdfdfd", "#c8f542", "#111111"],
  },
  {
    description: "Soft and playful. Sage green, rounded type, peach accent.",
    id: "meadow",
    name: "Meadow",
    swatch: ["#f4f9f4", "#7cc48f", "#2f4a3a"],
  },
] as const satisfies readonly ThemeOption[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "base";

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && THEMES.some((theme) => theme.id === value);
