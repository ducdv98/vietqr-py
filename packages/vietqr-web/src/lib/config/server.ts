import "server-only";
import { parseConfig, type AppConfig } from "./parse";

let cached: AppConfig | undefined;

/** Server-only. Reads process.env at runtime, validates once, throws ConfigError if invalid. */
export function getConfig(): AppConfig {
  cached ??= parseConfig(process.env);
  return cached;
}
