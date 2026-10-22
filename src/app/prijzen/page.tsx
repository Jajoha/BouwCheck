import type { Metadata } from "next";
import { LadderPricing } from "@/components/marketing/ladder-pricing";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { PRICING_LEAD_TYPES, type LeadType } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Prijzen" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const user = await getCurrentUser();
  // Zonder Offertecheck valt die kaart en dat onderwerp weg
  const types = PRICING_LEAD_TYPES.filter((t) => env.features.offertecheck || t !== "offertecheck");
  const selected: LeadType = types.includes(plan as LeadType) ? (plan as LeadType) : "pro";
  return <LadderPricing selected={selected} types={types} offertecheck={env.features.offertecheck} user={user ? { name: user.name, email: user.email } : null} />;
}
