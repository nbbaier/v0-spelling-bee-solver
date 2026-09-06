import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader, Nunito } from "next/font/google";
import { FeedbackWidget } from "@/components/feedback-widget";
import { ThemePicker } from "@/components/theme-picker";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
// Fonts used only by style-experiment variants (see lib/themes.ts).
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

// Applies the chosen theme before first paint so variants don't flash.
// `?theme=<id>` in the URL wins and is persisted; otherwise localStorage.
// Only known theme ids are applied; the default theme sets no attribute.
const themeBootstrap = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var ok=${JSON.stringify(THEMES.map((theme) => theme.id))};var q=new URLSearchParams(location.search).get("theme");var t=q&&ok.indexOf(q)>-1?q:localStorage.getItem(k);if(q&&q===t){localStorage.setItem(k,t)}if(t&&t!==${JSON.stringify(DEFAULT_THEME)}&&ok.indexOf(t)>-1){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export const metadata: Metadata = {
  description:
    "Track your NYT Spelling Bee progress with an interactive matrix and hint list",
  generator: "v0.app",
  icons: {
    apple: "/apple-icon.png",
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/icon-light-32x32.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/icon-dark-32x32.png",
      },
      {
        type: "image/svg+xml",
        url: "/icon.svg",
      },
    ],
  },
  title: "Spelling Bee Solver",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "white", media: "(prefers-color-scheme: light)" },
    { color: "black", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${nunito.variable} bg-background`}
      lang="en"
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time string with no user input
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ThemePicker />
        <FeedbackWidget />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
