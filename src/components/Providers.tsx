"use client";

import { CurrencyProvider } from "./CurrencyContext";
import { CatalogProvider } from "./CatalogContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </CatalogProvider>
  );
}
