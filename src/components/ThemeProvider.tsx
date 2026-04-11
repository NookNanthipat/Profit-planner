import { ThemeProvider as NextThemeProvider } from "next-themes";
import { type ReactNode } from "react";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemeProvider attribute="class" defaultTheme="light" enableSystem>
    {children}
  </NextThemeProvider>
);
