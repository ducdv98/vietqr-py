import { notFound } from "next/navigation";
import { Studio } from "@/components/studio/studio";
import { getConfig } from "@/lib/config/server";
import { defaultParams, parseParams } from "@/lib/studio/params";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { defaultTemplate, enabledPages } = getConfig();
  if (!enabledPages.includes("studio")) notFound();
  const initial = parseParams(
    await searchParams,
    defaultParams(defaultTemplate),
  );
  return <Studio initial={initial} />;
}
