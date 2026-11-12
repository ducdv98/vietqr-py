import { getConfig } from "@/lib/config/server";

export default function HomePage() {
  const { appName, defaultTemplate } = getConfig();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{appName}</h1>
      <p className="text-muted-foreground">
        Studio placeholder (default Template: {defaultTemplate}).
      </p>
    </section>
  );
}
