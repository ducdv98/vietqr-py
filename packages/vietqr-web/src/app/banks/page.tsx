import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BanksBrowser } from "@/components/banks/banks-browser";
import { getConfig } from "@/lib/config/server";

export default async function BanksPage() {
  if (!getConfig().enabledPages.includes("banks")) notFound();
  const t = await getTranslations("Banks");
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-[56ch] text-muted-foreground">{t("intro")}</p>
      </header>
      <BanksBrowser />
    </section>
  );
}
