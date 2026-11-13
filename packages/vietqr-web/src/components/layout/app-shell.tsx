import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getNavItems } from "@/config/nav";
import type { AppConfig } from "@/lib/config/parse";
import { StatusFooter } from "@/components/status/status-footer";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const nav = getNavItems(config.enabledPages).map((item) => ({
    href: item.href,
    label: t(`Nav.${item.labelKey}`),
  }));
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-2"
      >
        {t("Shell.skipToContent")}
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6 sm:py-0 sm:h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          >
            {config.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.appLogo} alt="" className="h-6 w-auto" />
            ) : (
              <QrCode aria-hidden className="size-[22px] text-primary" />
            )}
            {config.appName}
          </Link>
          <NavLinks items={nav} label={t("Nav.label")} />
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6 sm:py-10"
      >
        {children}
      </main>
      <footer className="border-t border-border text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
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
