import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { LeadForm } from "@/components/marketing/lead-form";
import { getCurrentUser } from "@/lib/auth/session";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader title="Contact" description={`Vragen, feedback op de bèta of interesse in een pilot? Stuur ons een bericht. Of mail naar ${site.contactEmail} (voorbeeldadres in de bèta).`} />
      <div className="mt-6 rounded-xl border border-ink-200 bg-white p-6">
        <LeadForm type="contact" name={user?.name} email={user?.email} messagePlaceholder="Je vraag of feedback" />
      </div>
    </div>
  );
}
