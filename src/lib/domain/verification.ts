/**
 * Verificatieniveaus. Een niveau wordt uitsluitend afgeleid uit goedgekeurde
 * verificatiegebeurtenissen en gecontroleerde projectresultaten — nooit uit
 * een los "geverifieerd"-veld.
 */
export const VERIFICATION_LEVELS = {
  zelf_opgegeven: {
    label: "Zelf opgegeven",
    description: "Informatie is door het bedrijf zelf aangeleverd en niet door BouwCheck gecontroleerd.",
    rank: 0,
  },
  bedrijfsgegevens_gecontroleerd: {
    label: "Bedrijfsgegevens gecontroleerd",
    description: "Bedrijfsgegevens (zoals KvK-inschrijving) zijn administratief gecontroleerd.",
    rank: 1,
  },
  opdrachtgever_bevestigd: {
    label: "Opdrachtgever bevestigd",
    description: "Ten minste één projectresultaat is door de opdrachtgever bevestigd.",
    rank: 2,
  },
  projectgegevens_gecontroleerd: {
    label: "Projectgegevens gecontroleerd",
    description: "Ten minste één projectresultaat is gecontroleerd aan de hand van projectdocumentatie.",
    rank: 3,
  },
} as const;
export type VerificationLevel = keyof typeof VERIFICATION_LEVELS;

export type VerificationSummary = {
  businessVerified: boolean;
  clientConfirmedProjects: number;
  verifiedProjects: number;
  levels: VerificationLevel[];
  highest: VerificationLevel;
};

export function summarizeVerification(input: {
  approvedEventTypes: string[];
  clientConfirmedProjects: number;
  verifiedProjects: number;
}): VerificationSummary {
  const levels: VerificationLevel[] = [];
  const businessVerified = input.approvedEventTypes.includes("bedrijfsgegevens");
  if (businessVerified) levels.push("bedrijfsgegevens_gecontroleerd");
  if (input.clientConfirmedProjects > 0) levels.push("opdrachtgever_bevestigd");
  if (input.verifiedProjects > 0) levels.push("projectgegevens_gecontroleerd");
  const highest = levels.length
    ? levels.reduce((a, b) => (VERIFICATION_LEVELS[a].rank >= VERIFICATION_LEVELS[b].rank ? a : b))
    : "zelf_opgegeven";
  return {
    businessVerified,
    clientConfirmedProjects: input.clientConfirmedProjects,
    verifiedProjects: input.verifiedProjects,
    levels: levels.length ? levels : ["zelf_opgegeven"],
    highest,
  };
}
