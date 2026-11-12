import Link from "next/link";
import { getNavItems } from "@/config/nav";
import type { AppConfig } from "@/lib/config/parse";

export function AppShell({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  const nav = getNavItems(config.enabledPages);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {config.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.appLogo} alt="" className="h-6 w-auto" />
            ) : null}
            {config.appName}
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {nav.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className="hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          {config.footerLinks.map((l) => (
            <a key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </a>
          ))}
          {/* Status footer (/health) is added by a follow-up ticket. */}
        </div>
      </footer>
    </div>
  );
}
