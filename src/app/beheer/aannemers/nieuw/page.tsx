import type { Metadata } from "next";
import { PageHeader, Notice } from "@/components/ui/misc";
import { ContractorProfileForm } from "@/components/portal/contractor-profile-form";
import { emptyContractorProfile } from "@/components/portal/profile-defaults";
import { adminSaveContractorAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Beheer — aannemer toevoegen" };

export default async function NewContractorAdmin() {
  await requireAdmin("/beheer/aannemers/nieuw");
  const action = adminSaveContractorAction.bind(null, null);
  return (
    <>
      <PageHeader title="Aannemer toevoegen" description="Een nieuw profiel heeft geen verificaties; voeg die na controle apart toe." />
      <Notice tone="info" className="mt-6">
        Gebruik geen gegevens van bestaande bedrijven zonder hun toestemming en een controle van de juistheid.
      </Notice>
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <ContractorProfileForm action={action} initial={emptyContractorProfile} submitLabel="Aannemer opslaan" showStatus />
      </div>
    </>
  );
}
