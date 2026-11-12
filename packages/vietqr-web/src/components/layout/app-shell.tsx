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
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="h-0.5 bg-gradient-to-r from-red-500 via-primary to-primary" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary"
          >
            {config.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.appLogo} alt="" className="h-6 w-auto" />
            ) : null}
            {config.appName}
          </Link>
          <nav aria-label={t("Nav.label")} className="flex gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className="rounded-lg px-3 py-1.5 font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
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
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border bg-card/60 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
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
