import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BanksBrowser } from "@/components/banks/banks-browser";
import { getConfig } from "@/lib/config/server";

export default async function BanksPage() {
  if (!getConfig().enabledPages.includes("banks")) notFound();
  const t = await getTranslations("Banks");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <BanksBrowser />
    </section>
  );
}
