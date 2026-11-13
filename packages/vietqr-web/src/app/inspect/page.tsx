import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Inspector } from "@/components/inspect/inspector";
import { getConfig } from "@/lib/config/server";

export default async function InspectPage() {
  if (!getConfig().enabledPages.includes("inspect")) notFound();
  const t = await getTranslations("Inspect");
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-[56ch] text-muted-foreground">{t("intro")}</p>
      </header>
      <Inspector />
    </section>
  );
}
