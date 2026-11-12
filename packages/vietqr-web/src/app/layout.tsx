import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme-script";
import { ConfigProvider } from "@/lib/config";
import { QueryProvider } from "@/lib/query/provider";
import { getConfig } from "@/lib/config/server";
import "./globals.css";

// Config comes from runtime env, so never prerender it at build time.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const { appName } = getConfig();
  return { title: appName, description: `${appName} - VietQR code generator` };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getConfig();
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ConfigProvider config={config}>
            <QueryProvider>
              <AppShell config={config}>{children}</AppShell>
            </QueryProvider>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
