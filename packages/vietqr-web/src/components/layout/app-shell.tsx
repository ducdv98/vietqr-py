import { useTranslations } from "next-intl";
import Link from "next/link";
import { getNavItems } from "@/config/nav";
import type { AppConfig } from "@/lib/config/parse";
import { StatusFooter } from "@/components/status/status-footer";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const nav = getNavItems(config.enabledPages);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-background focus:p-2"
      >
        {t("Shell.skipToContent")}
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {config.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.appLogo} alt="" className="h-6 w-auto" />
            ) : null}
            {config.appName}
          </Link>
          <nav aria-label={t("Nav.label")} className="flex gap-4 text-sm">
            {nav.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className="hover:underline"
              >
                {t(`Nav.${item.labelKey}`)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <nav aria-label={t("Footer.label")} className="flex flex-wrap gap-4">
            {config.footerLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:underline">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <StatusFooter />
          </div>
        </div>
      </footer>
    </div>
  );
}
