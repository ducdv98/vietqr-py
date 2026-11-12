import { notFound } from "next/navigation";
import { BankDetail } from "@/components/banks/bank-detail";
import { getConfig } from "@/lib/config/server";

export default async function BankDetailPage({
  params,
}: {
  params: Promise<{ binOrCode: string }>;
}) {
  if (!getConfig().enabledPages.includes("banks")) notFound();
  const { binOrCode } = await params;
  return <BankDetail binOrCode={decodeURIComponent(binOrCode)} />;
}
