"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppConfig } from "./parse";

const ConfigContext = createContext<AppConfig | null>(null);

/** Rendered by the root server layout with the validated config as a prop. */
export function ConfigProvider({
  config,
  children,
}: {
  config: AppConfig;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

/** Client components: read the runtime config. */
export function useConfig(): AppConfig {
  const config = useContext(ConfigContext);
  if (!config)
    throw new Error("useConfig must be used inside <ConfigProvider>");
  return config;
}
