import { getTranslations } from "next-intl/server";
import { getConfig } from "@/lib/config/server";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const { appName, defaultTemplate } = getConfig();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{appName}</h1>
      <p className="text-muted-foreground">
        {t("placeholder", { template: defaultTemplate })}
      </p>
    </section>
  );
}
