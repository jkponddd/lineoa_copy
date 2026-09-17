"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects its FOUC-prevention <script> via React.createElement,
// which React 19.2's dev-only client renderer flags whenever that script
// re-renders on a client-side navigation (e.g. switching locale re-renders
// the root layout). The script still runs correctly via SSR and the theme
// still applies — this is a known false positive with no fix yet upstream:
// https://github.com/pacocoursey/next-themes/issues/387
// https://github.com/shadcn-ui/ui/issues/10104
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
