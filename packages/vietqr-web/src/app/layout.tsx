import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { ConfigProvider } from "@/lib/config";
import { getConfig } from "@/lib/config/server";
import "./globals.css";

// Config comes from runtime env, so never prerender it at build time.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const { appName } = getConfig();
  return { title: appName, description: `${appName} - VietQR code generator` };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getConfig();
  return (
    <html lang={config.defaultLocale}>
      <body>
        <ConfigProvider config={config}>
          <AppShell config={config}>{children}</AppShell>
        </ConfigProvider>
      </body>
    </html>
  );
}
