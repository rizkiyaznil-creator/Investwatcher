"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeContext";
import { CurrencyProvider } from "./CurrencyContext";
import { CatalogProvider } from "./CatalogContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <CatalogProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </CatalogProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
