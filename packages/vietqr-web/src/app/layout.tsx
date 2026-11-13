import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme-script";
import { ConfigProvider } from "@/lib/config";
import { QueryProvider } from "@/lib/query/provider";
import { getConfig } from "@/lib/config/server";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-be-vietnam",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

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
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ConfigProvider config={config}>
            <QueryProvider>
              <ToastProvider>
                <AppShell config={config}>{children}</AppShell>
              </ToastProvider>
            </QueryProvider>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
