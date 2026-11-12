import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Inspector } from "@/components/inspect/inspector";
import { getConfig } from "@/lib/config/server";

export default async function InspectPage() {
  if (!getConfig().enabledPages.includes("inspect")) notFound();
  const t = await getTranslations("Inspect");
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <Inspector />
    </section>
  );
}
