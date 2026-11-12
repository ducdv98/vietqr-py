// Client-safe exports only. Server code imports getConfig from "@/lib/config/server".
export { ConfigProvider, useConfig } from "./provider";
export type { AppConfig, FooterLink, Locale, PageId, Template } from "./parse";
