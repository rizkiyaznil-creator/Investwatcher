"use client";

import { ThemeProvider } from "./ThemeContext";
import { CurrencyProvider } from "./CurrencyContext";
import { CatalogProvider } from "./CatalogContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CatalogProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </CatalogProvider>
    </ThemeProvider>
  );
}
