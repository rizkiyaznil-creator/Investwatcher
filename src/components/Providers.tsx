"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeContext";
import { CurrencyProvider } from "./CurrencyContext";
import { CatalogProvider } from "./CatalogContext";
import IntradayAlertWatcher from "./IntradayAlertWatcher";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <CatalogProvider>
          <CurrencyProvider>
            {children}
            <IntradayAlertWatcher />
          </CurrencyProvider>
        </CatalogProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
