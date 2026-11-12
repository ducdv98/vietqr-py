import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PayView } from "@/components/pay/pay-view";
import { getConfig } from "@/lib/config/server";
import { defaultParams, parseParams } from "@/lib/studio/params";

// Payment details are in the URL: no Referer leaks, no indexing (headers set in next.config.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getConfig().enabledPages.includes("pay")) notFound();
  return <PayView params={parseParams(await searchParams, defaultParams())} />;
}
