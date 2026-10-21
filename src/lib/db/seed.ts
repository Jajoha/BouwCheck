/**
 * Demo-seed voor BouwCheck.
 *
 * ALLE gegevens hieronder zijn FICTIEF: bedrijfsnamen, KvK-nummers, contact-
 * gegevens, projectresultaten en beoordelingen zijn verzonnen voor
 * demonstratiedoeleinden en zijn als `is_demo = true` gemarkeerd. Ze zeggen
 * niets over bestaande ondernemingen.
 */
import type { Database, Queryable } from "./index";
import { hashPassword } from "@/lib/auth/password";

import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
export { DEMO_ACCOUNTS, DEMO_PASSWORD };

// Deterministische pseudo-random generator, zodat de demo reproduceerbaar is.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type RateSpec = { description: string; unit: string; min: number; max: number; materials: boolean | null };
const BASE_RATES: Record<string, RateSpec[]> = {
  hoofdaannemer: [
    { description: "Complete renovatie (casco t/m afwerking)", unit: "m2", min: 550, max: 850, materials: true },
    { description: "Uurtarief vakman", unit: "uur", min: 48, max: 58, materials: false },
  ],
  sloopwerk: [
    { description: "Strippen woning incl. afvoer puin", unit: "m2", min: 25, max: 45, materials: null },
    { description: "Uurtarief sloper", unit: "uur", min: 42, max: 50, materials: false },
  ],
  elektricien: [
    { description: "Nieuwe groepenkast incl. aardlekautomaten", unit: "stuk", min: 1100, max: 1600, materials: true },
    { description: "Extra aansluitpunt (wcd of lichtpunt)", unit: "stuk", min: 85, max: 130, materials: true },
    { description: "Uurtarief installateur", unit: "uur", min: 52, max: 62, materials: false },
  ],
  loodgieter: [
    { description: "Vervangen leidingwerk woning", unit: "project", min: 2500, max: 4500, materials: true },
    { description: "Uurtarief loodgieter", unit: "uur", min: 50, max: 60, materials: false },
  ],
  stukadoor: [
    { description: "Wanden sausklaar stucen", unit: "m2", min: 14, max: 22, materials: true },
    { description: "Plafond spuitwerk", unit: "m2", min: 10, max: 16, materials: true },
  ],
  schilder: [
    { description: "Binnenschilderwerk wanden en plafonds", unit: "m2", min: 9, max: 15, materials: true },
    { description: "Buitenkozijn schilderen", unit: "stuk", min: 140, max: 220, materials: true },
  ],
  tegelzetter: [
    { description: "Wandtegels zetten (excl. tegels)", unit: "m2", min: 45, max: 70, materials: false },
    { description: "Vloertegels zetten (excl. tegels)", unit: "m2", min: 40, max: 65, materials: false },
  ],
  timmerman: [
    { description: "Binnendeur plaatsen incl. afhangen", unit: "stuk", min: 180, max: 280, materials: false },
    { description: "Uurtarief timmerman", unit: "uur", min: 45, max: 55, materials: false },
  ],
  keukeninstallateur: [
    { description: "Keuken monteren en aansluiten (excl. keuken)", unit: "project", min: 900, max: 1600, materials: false },
  ],
  badkamerinstallateur: [
    { description: "Complete badkamer ca. 6 m² incl. sanitair middensegment", unit: "project", min: 11000, max: 17000, materials: true },
  ],
  dakdekker: [
    { description: "Pannendak vernieuwen incl. isolatie", unit: "m2", min: 140, max: 210, materials: true },
    { description: "Plat dak bitumen vernieuwen", unit: "m2", min: 70, max: 110, materials: true },
  ],
  vloerenlegger: [
    { description: "PVC-vloer leggen (excl. materiaal)", unit: "m2", min: 14, max: 22, materials: false },
    { description: "Ondervloer egaliseren", unit: "m2", min: 10, max: 16, materials: true },
  ],
  isolatiespecialist: [
    { description: "Spouwmuurisolatie", unit: "m2", min: 22, max: 32, materials: true },
    { description: "Vloerisolatie kruipruimte", unit: "m2", min: 28, max: 40, materials: true },
  ],
  klusser: [
    { description: "Klusuurtarief (kleine klussen en afwerking)", unit: "uur", min: 35, max: 45, materials: false },
    { description: "Plinten plaatsen", unit: "meter", min: 7, max: 11, materials: false },
    { description: "Binnendeur afhangen", unit: "stuk", min: 90, max: 140, materials: false },
  ],
};
const LEVEL_FACTOR: Record<string, number> = { budget: 0.85, midden: 1, premium: 1.2, onbekend: 1 };

const TYPICAL_BUDGET: Record<string, [number, number]> = {
  hoofdaannemer: [38000, 120000],
  sloopwerk: [3500, 12000],
  elektricien: [3000, 14000],
  loodgieter: [2500, 9000],
  stukadoor: [2500, 9000],
  schilder: [2000, 8000],
  tegelzetter: [3500, 11000],
  timmerman: [2500, 10000],
  keukeninstallateur: [1500, 4000],
  badkamerinstallateur: [9000, 19000],
  dakdekker: [7000, 24000],
  vloerenlegger: [1800, 6500],
  isolatiespecialist: [3000, 12000],
  klusser: [400, 2500],
};
const TYPICAL_DURATION: Record<string, number> = {
  hoofdaannemer: 65,
  sloopwerk: 7,
  elektricien: 12,
  loodgieter: 10,
  stukadoor: 9,
  schilder: 10,
  tegelzetter: 12,
  timmerman: 10,
  keukeninstallateur: 4,
  badkamerinstallateur: 15,
  dakdekker: 10,
  vloerenlegger: 5,
  klusser: 3,
  isolatiespecialist: 4,
};

type Profile = {
  n: number;
  onTime: number;
  devMean: number;
  devSpread: number;
  rating: number;
  verified: number;
  confirmed: number;
  rework: number;
  reviewShare: number;
  fromYear?: number;
  toYear?: number;
};

type ContractorSpec = {
  key: string;
  name: string;
  providerType?: "bedrijf" | "zzp" | "klusser";
  description: string;
  city: string;
  province: string;
  areas: string[];
  specialties: string[];
  priceLevel: "budget" | "midden" | "premium" | "onbekend";
  availability: string;
  availableFrom: string | null;
  teamSize: number;
  founded: number;
  projectTypes: string[];
  businessVerified: boolean;
  status?: "actief" | "in_beoordeling" | "gedeactiveerd";
  profile: Profile;
  references: { title: string; city: string; property_type: string; renovation_type: string; year: number; description: string; work: string[] }[];
};

const CONTRACTORS: ContractorSpec[] = [
  {
    key: "lindewaard",
    name: "Bouwgroep Lindewaard",
    description:
      "Hoofdaannemer voor complete woningrenovaties en splitsingen. Werkt met een vaste ploeg en eigen projectleider per project. Levert een gespecificeerde offerte per bouwdeel.",
    city: "Amersfoort",
    province: "Utrecht",
    areas: ["Utrecht", "Gelderland", "Noord-Holland"],
    specialties: ["hoofdaannemer", "sloopwerk", "timmerman"],
    priceLevel: "premium",
    availability: "binnen_3_maanden",
    availableFrom: "2027-01-11",
    teamSize: 24,
    founded: 2004,
    projectTypes: ["Complete renovatie", "Gedeeltelijke renovatie", "Splitsing / transformatie"],
    businessVerified: true,
    profile: { n: 11, onTime: 0.82, devMean: 3, devSpread: 8, rating: 4.4, verified: 0.7, confirmed: 0.2, rework: 0.1, reviewShare: 0.9 },
    references: [
      { title: "Renovatie jaren-30 woning", city: "Hilversum", property_type: "Twee-onder-een-kapwoning", renovation_type: "Complete renovatie", year: 2025, description: "Volledige strip, nieuwe installaties, aanbouw keuken.", work: ["hoofdaannemer", "sloopwerk", "timmerman"] },
      { title: "Splitsing bovenwoning in twee appartementen", city: "Utrecht", property_type: "Bovenwoning", renovation_type: "Splitsing / transformatie", year: 2024, description: "Brandscheiding, twee nieuwe badkamers en keukens.", work: ["hoofdaannemer"] },
    ],
  },
  {
    key: "snelbouw-oost",
    name: "Renovatiebedrijf Snelbouw Oost",
    description:
      "Compact renovatieteam gespecialiseerd in snelle doorlooptijden voor verkoopklare woningen. Plant projecten strak, maar heeft beperkte capaciteit.",
    city: "Deventer",
    province: "Overijssel",
    areas: ["Overijssel", "Gelderland", "Utrecht"],
    specialties: ["hoofdaannemer"],
    priceLevel: "midden",
    availability: "vol",
    availableFrom: "2027-02-15",
    teamSize: 6,
    founded: 2015,
    projectTypes: ["Complete renovatie", "Cosmetische opknapbeurt"],
    businessVerified: true,
    profile: { n: 6, onTime: 0.83, devMean: 6, devSpread: 10, rating: 4.1, verified: 0.5, confirmed: 0.3, rework: 0.17, reviewShare: 0.85 },
    references: [
      { title: "Tussenwoning verkoopklaar in 5 weken", city: "Zutphen", property_type: "Tussenwoning", renovation_type: "Complete renovatie", year: 2025, description: "Nieuwe keuken, badkamer, vloeren en schilderwerk.", work: ["hoofdaannemer"] },
    ],
  },
  {
    key: "nieuwe-hoek",
    name: "Klusbedrijf De Nieuwe Hoek",
    description:
      "Jong klusbedrijf voor renovaties en opknapbeurten. Scherp geprijsd; elektra en loodgieterswerk worden uitbesteed aan onderaannemers.",
    city: "Gouda",
    province: "Zuid-Holland",
    areas: ["Zuid-Holland", "Utrecht"],
    specialties: ["hoofdaannemer", "schilder", "timmerman"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 3,
    founded: 2021,
    projectTypes: ["Gedeeltelijke renovatie", "Cosmetische opknapbeurt"],
    businessVerified: false,
    profile: { n: 2, onTime: 0.5, devMean: 9, devSpread: 6, rating: 3.8, verified: 0, confirmed: 0.5, rework: 0.5, reviewShare: 1 },
    references: [
      { title: "Opknapbeurt benedenwoning", city: "Gouda", property_type: "Benedenwoning", renovation_type: "Cosmetische opknapbeurt", year: 2025, description: "Wanden, vloeren en schilderwerk.", work: ["schilder", "timmerman"] },
    ],
  },
  {
    key: "polderstaete",
    name: "Aannemersbedrijf Polderstaete",
    description: "Middelgrote aannemer voor renovatie en verduurzaming van grondgebonden woningen in de Randstad.",
    city: "Almere",
    province: "Flevoland",
    areas: ["Flevoland", "Noord-Holland", "Utrecht"],
    specialties: ["hoofdaannemer", "isolatiespecialist"],
    priceLevel: "midden",
    availability: "binnen_1_maand",
    availableFrom: "2026-11-16",
    teamSize: 12,
    founded: 2009,
    projectTypes: ["Complete renovatie", "Verduurzaming"],
    businessVerified: true,
    profile: { n: 5, onTime: 0.6, devMean: 12, devSpread: 10, rating: 3.7, verified: 0.4, confirmed: 0.4, rework: 0.2, reviewShare: 0.8 },
    references: [
      { title: "Verduurzaming rijwoning naar label A", city: "Almere", property_type: "Tussenwoning", renovation_type: "Verduurzaming", year: 2024, description: "Isolatie, warmtepomp-voorbereiding en nieuwe kozijnen.", work: ["hoofdaannemer", "isolatiespecialist"] },
    ],
  },
  {
    key: "vonkenberg",
    name: "Elektro Vonkenberg",
    description: "Elektrotechnisch installatiebedrijf voor renovaties: groepenkasten, complete herbedrading en voorbereiding op warmtepompen.",
    city: "Tilburg",
    province: "Noord-Brabant",
    areas: ["Noord-Brabant", "Limburg", "Zeeland"],
    specialties: ["elektricien"],
    priceLevel: "midden",
    availability: "binnen_1_maand",
    availableFrom: "2026-11-09",
    teamSize: 8,
    founded: 2011,
    projectTypes: ["Complete renovatie", "Verduurzaming"],
    businessVerified: true,
    profile: { n: 7, onTime: 0.86, devMean: 2, devSpread: 6, rating: 4.5, verified: 0.6, confirmed: 0.3, rework: 0, reviewShare: 0.85 },
    references: [
      { title: "Complete herbedrading jaren-60 woning", city: "Tilburg", property_type: "Tussenwoning", renovation_type: "Complete renovatie", year: 2025, description: "Nieuwe groepenkast met 3-fase aansluiting.", work: ["elektricien"] },
    ],
  },
  {
    key: "waterhoek",
    name: "Installatietechniek Waterhoek",
    description: "Loodgieters- en badkamerbedrijf. Levert badkamers inclusief leidingwerk; tegelwerk wordt in overleg uitbesteed.",
    city: "Delft",
    province: "Zuid-Holland",
    areas: ["Zuid-Holland"],
    specialties: ["loodgieter", "badkamerinstallateur"],
    priceLevel: "midden",
    availability: "binnen_3_maanden",
    availableFrom: "2026-12-07",
    teamSize: 5,
    founded: 2013,
    projectTypes: ["Badkamer en/of keuken", "Complete renovatie"],
    businessVerified: true,
    profile: { n: 4, onTime: 0.75, devMean: 5, devSpread: 8, rating: 4.0, verified: 0.25, confirmed: 0.5, rework: 0.25, reviewShare: 1 },
    references: [
      { title: "Badkamer bovenwoning", city: "Rotterdam", property_type: "Bovenwoning", renovation_type: "Badkamer en/of keuken", year: 2025, description: "Nieuwe badkamer met inloopdouche op houten vloer.", work: ["loodgieter", "badkamerinstallateur"] },
    ],
  },
  {
    key: "gladmeer",
    name: "Stukadoorsbedrijf Gladmeer",
    description: "Stucwerk, spuitwerk en sierpleister voor renovatieprojecten. Kleine ploeg, korte doorlooptijden.",
    city: "Utrecht",
    province: "Utrecht",
    areas: ["Utrecht", "Noord-Holland", "Zuid-Holland"],
    specialties: ["stukadoor"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 4,
    founded: 2017,
    projectTypes: ["Complete renovatie", "Cosmetische opknapbeurt"],
    businessVerified: false,
    profile: { n: 3, onTime: 1, devMean: 1, devSpread: 4, rating: 4.3, verified: 0.34, confirmed: 0.66, rework: 0, reviewShare: 1 },
    references: [
      { title: "Stucwerk complete benedenverdieping", city: "Utrecht", property_type: "Tussenwoning", renovation_type: "Complete renovatie", year: 2025, description: "Wanden en plafonds sausklaar.", work: ["stukadoor"] },
    ],
  },
  {
    key: "kwastenburg",
    name: "Schildersbedrijf Kwastenburg",
    description: "Nieuw schildersbedrijf voor binnen- en buitenschilderwerk. Nog weinig projecthistorie op BouwCheck.",
    city: "Arnhem",
    province: "Gelderland",
    areas: ["Gelderland", "Overijssel"],
    specialties: ["schilder"],
    priceLevel: "midden",
    availability: "direct",
    availableFrom: null,
    teamSize: 2,
    founded: 2023,
    projectTypes: ["Cosmetische opknapbeurt"],
    businessVerified: false,
    profile: { n: 0, onTime: 0, devMean: 0, devSpread: 0, rating: 0, verified: 0, confirmed: 0, rework: 0, reviewShare: 0 },
    references: [
      { title: "Buitenschilderwerk portiekflat", city: "Arnhem", property_type: "Portiekwoning", renovation_type: "Cosmetische opknapbeurt", year: 2025, description: "Kozijnen en deuren buitenzijde.", work: ["schilder"] },
    ],
  },
  {
    key: "mozaiekhof",
    name: "Tegelwerken Mozaïekhof",
    description: "Tegelzetter en badkamerspecialist voor het hogere segment. Werkt met vaste leveranciers en levert een uitgebreide opleverrapportage.",
    city: "'s-Hertogenbosch",
    province: "Noord-Brabant",
    areas: ["Noord-Brabant", "Gelderland", "Zuid-Holland"],
    specialties: ["tegelzetter", "badkamerinstallateur"],
    priceLevel: "premium",
    availability: "binnen_3_maanden",
    availableFrom: "2026-12-14",
    teamSize: 7,
    founded: 2008,
    projectTypes: ["Badkamer en/of keuken", "Complete renovatie"],
    businessVerified: true,
    profile: { n: 6, onTime: 0.83, devMean: 2, devSpread: 5, rating: 4.7, verified: 0.67, confirmed: 0.33, rework: 0, reviewShare: 1 },
    references: [
      { title: "Badkamer met natuursteen", city: "Vught", property_type: "Vrijstaande woning", renovation_type: "Badkamer en/of keuken", year: 2025, description: "Volledige badkamer met inloopdouche en vrijstaand bad.", work: ["tegelzetter", "badkamerinstallateur"] },
    ],
  },
  {
    key: "eikenrand",
    name: "Timmerbedrijf Eikenrand",
    description: "Timmerwerk en vloeren: binnendeuren, aftimmeren, trappen en houten of PVC-vloeren.",
    city: "Leeuwarden",
    province: "Friesland",
    areas: ["Friesland", "Groningen", "Drenthe"],
    specialties: ["timmerman", "vloerenlegger"],
    priceLevel: "budget",
    availability: "binnen_1_maand",
    availableFrom: "2026-11-23",
    teamSize: 3,
    founded: 2016,
    projectTypes: ["Complete renovatie", "Gedeeltelijke renovatie"],
    businessVerified: true,
    profile: { n: 3, onTime: 0.67, devMean: 4, devSpread: 6, rating: 4.0, verified: 0, confirmed: 0.67, rework: 0.34, reviewShare: 1 },
    references: [
      { title: "Nieuwe vloeren en deuren rijwoning", city: "Sneek", property_type: "Tussenwoning", renovation_type: "Gedeeltelijke renovatie", year: 2024, description: "PVC-vloer beneden, nieuwe binnendeuren.", work: ["timmerman", "vloerenlegger"] },
    ],
  },
  {
    key: "kaalslag",
    name: "Sloop- en Stripbedrijf Kaalslag Zuid",
    description: "Strippen van woningen tot casco, inclusief afvoer en scheiding van bouwafval. Asbestsanering valt buiten de scope.",
    city: "Dordrecht",
    province: "Zuid-Holland",
    areas: ["Zuid-Holland", "Zeeland", "Noord-Brabant"],
    specialties: ["sloopwerk"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 9,
    founded: 2012,
    projectTypes: ["Complete renovatie", "Splitsing / transformatie"],
    businessVerified: true,
    profile: { n: 4, onTime: 1, devMean: -2, devSpread: 4, rating: 4.2, verified: 0.5, confirmed: 0.25, rework: 0, reviewShare: 0.75 },
    references: [
      { title: "Strippen portiekwoning tot casco", city: "Dordrecht", property_type: "Portiekwoning", renovation_type: "Complete renovatie", year: 2025, description: "Incl. afvoer en containerbeheer.", work: ["sloopwerk"] },
    ],
  },
  {
    key: "pannenhoog",
    name: "Dakwerken Pannenhoog",
    description: "Dakdekker voor hellende en platte daken, inclusief dakisolatie aan de buitenzijde.",
    city: "Alkmaar",
    province: "Noord-Holland",
    areas: ["Noord-Holland", "Flevoland"],
    specialties: ["dakdekker", "isolatiespecialist"],
    priceLevel: "midden",
    availability: "binnen_3_maanden",
    availableFrom: "2027-01-04",
    teamSize: 6,
    founded: 2010,
    projectTypes: ["Dak en gevel", "Verduurzaming"],
    businessVerified: true,
    profile: { n: 3, onTime: 0.67, devMean: 7, devSpread: 8, rating: 3.9, verified: 0.34, confirmed: 0.34, rework: 0.34, reviewShare: 1 },
    references: [
      { title: "Pannendak vernieuwd met isolatie", city: "Heerhugowaard", property_type: "Hoekwoning", renovation_type: "Dak en gevel", year: 2024, description: "Nieuwe pannen, panlatten en Rc 6,0 isolatie.", work: ["dakdekker", "isolatiespecialist"] },
    ],
  },
  {
    key: "warmwand",
    name: "Isolatiebedrijf Warmwand",
    description: "Na-isolatie van spouwmuren, vloeren en daken. Beschikbaarheid wordt momenteel niet bijgehouden.",
    city: "Apeldoorn",
    province: "Gelderland",
    areas: ["Gelderland", "Overijssel", "Utrecht", "Noord-Brabant"],
    specialties: ["isolatiespecialist"],
    priceLevel: "midden",
    availability: "onbekend",
    availableFrom: null,
    teamSize: 5,
    founded: 2014,
    projectTypes: ["Verduurzaming"],
    businessVerified: true,
    profile: { n: 3, onTime: 0.67, devMean: 5, devSpread: 6, rating: 4.0, verified: 0.34, confirmed: 0.34, rework: 0, reviewShare: 1, fromYear: 2022, toYear: 2023 },
    references: [],
  },
  {
    key: "aanrechtwerk",
    name: "Keukenmontage Aanrechtwerk",
    description: "Montage en aansluiting van keukens van alle leveranciers. Levert geen keukens.",
    city: "Eindhoven",
    province: "Noord-Brabant",
    areas: ["Noord-Brabant", "Zuid-Holland", "Limburg"],
    specialties: ["keukeninstallateur"],
    priceLevel: "midden",
    availability: "direct",
    availableFrom: null,
    teamSize: 4,
    founded: 2019,
    projectTypes: ["Badkamer en/of keuken"],
    businessVerified: false,
    profile: { n: 1, onTime: 1, devMean: 0, devSpread: 0, rating: 5, verified: 0, confirmed: 0, rework: 0, reviewShare: 1 },
    references: [],
  },
  {
    key: "heidebloem",
    name: "Bouwcombinatie Heidebloem",
    description: "Aannemer voor grotere renovaties en transformaties in West-Brabant en Zeeland.",
    city: "Breda",
    province: "Noord-Brabant",
    areas: ["Noord-Brabant", "Zeeland"],
    specialties: ["hoofdaannemer", "sloopwerk"],
    priceLevel: "budget",
    availability: "binnen_1_maand",
    availableFrom: "2026-11-30",
    teamSize: 10,
    founded: 2006,
    projectTypes: ["Complete renovatie", "Splitsing / transformatie"],
    businessVerified: true,
    profile: { n: 5, onTime: 0.4, devMean: 16, devSpread: 10, rating: 3.4, verified: 0.4, confirmed: 0.4, rework: 0.4, reviewShare: 1 },
    references: [
      { title: "Transformatie winkel naar twee appartementen", city: "Roosendaal", property_type: "Bedrijfspand / transformatie", renovation_type: "Splitsing / transformatie", year: 2024, description: "Casco tot oplevering.", work: ["hoofdaannemer", "sloopwerk"] },
    ],
  },
  {
    key: "handige-henk",
    name: "Klusservice Handige Henk",
    providerType: "klusser",
    description:
      "Zelfstandige klusser voor afwerking en kleine klussen: plinten, deuren afhangen, kitwerk, ophangwerk en kleine reparaties. Werkt alleen en plant per dagdeel.",
    city: "Nieuwegein",
    province: "Utrecht",
    areas: ["Utrecht", "Gelderland"],
    specialties: ["klusser", "schilder"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 1,
    founded: 2021,
    projectTypes: ["Cosmetische opknapbeurt", "Gedeeltelijke renovatie"],
    businessVerified: true,
    profile: { n: 5, onTime: 0.8, devMean: 2, devSpread: 6, rating: 4.3, verified: 0.4, confirmed: 0.4, rework: 0.2, reviewShare: 1 },
    references: [
      { title: "Afwerking na renovatie tussenwoning", city: "Houten", property_type: "Tussenwoning", renovation_type: "Cosmetische opknapbeurt", year: 2025, description: "Plinten, deuren afhangen en schilderwerk kozijnen binnen.", work: ["klusser", "schilder"] },
    ],
  },
  {
    key: "timmerwerk-de-vries",
    name: "Timmerwerk De Vries",
    providerType: "zzp",
    description: "Zelfstandig timmerman (zzp): binnendeuren, kozijnen, wanden en vloeren. Neemt ook losse klussen aan tijdens renovaties.",
    city: "Hilversum",
    province: "Noord-Holland",
    areas: ["Noord-Holland", "Utrecht"],
    specialties: ["timmerman", "klusser"],
    priceLevel: "midden",
    availability: "binnen_1_maand",
    availableFrom: "2026-11-16",
    teamSize: 1,
    founded: 2017,
    projectTypes: ["Gedeeltelijke renovatie", "Complete renovatie"],
    businessVerified: false,
    profile: { n: 4, onTime: 0.75, devMean: 4, devSpread: 6, rating: 4.5, verified: 0.5, confirmed: 0.25, rework: 0, reviewShare: 1 },
    references: [],
  },
  {
    key: "klusmaat-arnhem",
    name: "Klusmaat Arnhem",
    providerType: "klusser",
    description: "Klusser voor kleine reparaties en opruimwerk. Recent gestart; nog weinig projectgegevens.",
    city: "Arnhem",
    province: "Gelderland",
    areas: ["Gelderland"],
    specialties: ["klusser"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 1,
    founded: 2026,
    projectTypes: ["Cosmetische opknapbeurt"],
    businessVerified: false,
    profile: { n: 1, onTime: 1, devMean: 0, devSpread: 2, rating: 4, verified: 0, confirmed: 1, rework: 0, reviewShare: 1 },
    references: [],
  },
  {
    key: "gebroeders-stal",
    name: "Bouwbedrijf Gebroeders Stal",
    description: "Demoprofiel met een fictief registersignaal: laat zien hoe een uitvoerder wordt uitgesloten van teamvoorstellen, met reden en bron.",
    city: "Utrecht",
    province: "Utrecht",
    areas: ["Utrecht"],
    specialties: ["hoofdaannemer", "sloopwerk"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 8,
    founded: 2012,
    projectTypes: ["Complete renovatie"],
    businessVerified: false,
    profile: { n: 3, onTime: 0.67, devMean: 8, devSpread: 10, rating: 3.9, verified: 0, confirmed: 0.33, rework: 0.33, reviewShare: 1 },
    references: [],
  },
  {
    key: "vlakvloer",
    name: "Vloerenbedrijf Vlakvloer",
    description: "Nieuwe aanmelding: PVC- en laminaatvloeren. Profiel wacht op beoordeling door beheer.",
    city: "Zwolle",
    province: "Overijssel",
    areas: ["Overijssel", "Drenthe"],
    specialties: ["vloerenlegger"],
    priceLevel: "budget",
    availability: "direct",
    availableFrom: null,
    teamSize: 2,
    founded: 2024,
    projectTypes: ["Cosmetische opknapbeurt"],
    businessVerified: false,
    status: "in_beoordeling",
    profile: { n: 0, onTime: 0, devMean: 0, devSpread: 0, rating: 0, verified: 0, confirmed: 0, rework: 0, reviewShare: 0 },
    references: [],
  },
  {
    key: "stroomlijn",
    name: "Elektrotechniek Stroomlijn",
    description: "Gedeactiveerd demoprofiel (voorbeeld van een profiel dat door beheer offline is gehaald).",
    city: "Groningen",
    province: "Groningen",
    areas: ["Groningen", "Drenthe"],
    specialties: ["elektricien"],
    priceLevel: "budget",
    availability: "onbekend",
    availableFrom: null,
    teamSize: 2,
    founded: 2020,
    projectTypes: ["Gedeeltelijke renovatie"],
    businessVerified: false,
    status: "gedeactiveerd",
    profile: { n: 2, onTime: 0.5, devMean: 10, devSpread: 6, rating: 3.5, verified: 0, confirmed: 0, rework: 0.5, reviewShare: 1 },
    references: [],
  },
];

const CITIES_BY_PROVINCE: Record<string, string[]> = {
  Utrecht: ["Utrecht", "Amersfoort", "Zeist", "Nieuwegein"],
  Gelderland: ["Arnhem", "Nijmegen", "Apeldoorn", "Ede"],
  "Noord-Holland": ["Haarlem", "Alkmaar", "Hilversum", "Zaandam"],
  "Zuid-Holland": ["Rotterdam", "Den Haag", "Leiden", "Dordrecht"],
  "Noord-Brabant": ["Eindhoven", "Tilburg", "Breda", "'s-Hertogenbosch"],
  Overijssel: ["Zwolle", "Deventer", "Enschede"],
  Flevoland: ["Almere", "Lelystad"],
  Limburg: ["Maastricht", "Venlo", "Heerlen"],
  Zeeland: ["Middelburg", "Vlissingen", "Goes"],
  Friesland: ["Leeuwarden", "Sneek", "Heerenveen"],
  Groningen: ["Groningen", "Veendam"],
  Drenthe: ["Assen", "Emmen"],
};

const REVIEW_TEXTS: Record<number, string[]> = {
  5: [
    "Afspraken werden nagekomen en de oplevering was netjes. Meerwerk werd vooraf besproken.",
    "Duidelijke planning en goede communicatie via de projectleider. Zou opnieuw kiezen voor dit bedrijf.",
  ],
  4: [
    "Goed werk geleverd. Kleine vertraging door levering van materialen, maar dat werd tijdig gemeld.",
    "Prettige samenwerking. Offerte was helder; een paar opleverpunten moesten nog worden afgerond.",
  ],
  3: [
    "Kwaliteit was redelijk, maar de communicatie over meerwerk kon beter.",
    "Planning liep uit. Uiteindelijk wel een acceptabel resultaat.",
  ],
  2: ["Meerdere afspraken niet nagekomen en meerwerk achteraf in rekening gebracht."],
  1: ["Oplevering veel later dan afgesproken en herstelwerk nodig."],
};

export async function seedDemoData(db: Database, log: (m: string) => void = () => {}) {
  await db.transaction(async (tx) => {
    await insertAll(tx);
  });
  log("Demo-data geladen.");
}

async function insertAll(tx: Queryable) {
  const pw = await hashPassword(DEMO_PASSWORD);
  const one = async <T = { id: string }>(text: string, params: unknown[]) => (await tx.query<T>(text, params))[0];

  // ── Gebruikers ──────────────────────────────────────────────
  const user = (email: string, name: string, role: string, company: string | null, region: string | null, types: string[]) =>
    one(
      `insert into users (email, name, password_hash, role, company_name, region, project_types, onboarded_at, is_demo)
       values ($1,$2,$3,$4,$5,$6,$7, now(), true) returning id`,
      [email, name, pw, role, company, region, types],
    );
  const flipper = await user(DEMO_ACCOUNTS.flipper, "Demo-gebruiker (vastgoedondernemer)", "flipper", "Demo Vastgoed B.V. (fictief)", "Utrecht", ["Complete renovatie", "Badkamer en/of keuken", "Verduurzaming"]);
  const admin = await user(DEMO_ACCOUNTS.admin, "Demo-beheerder", "beheerder", "BouwCheck (demo)", null, []);
  const contractorUser = await user(DEMO_ACCOUNTS.contractor, "Demo-aannemer (Kwastenburg)", "aannemer", "Schildersbedrijf Kwastenburg (fictief)", "Gelderland", []);
  const clients: { id: string }[] = [];
  for (let i = 1; i <= 6; i++) {
    clients.push(await user(`opdrachtgever-${i}@demo.bouwcheck.test`, `Demo-opdrachtgever ${i}`, i % 2 ? "flipper" : "investeerder", null, null, []));
  }

  // ── Aannemers ───────────────────────────────────────────────
  const ids: Record<string, string> = {};
  let kvk = 90000001;
  for (const c of CONTRACTORS) {
    const status = c.status ?? "actief";
    const row = await one(
      `insert into contractors (slug, company_name, description, city, hq_province, kvk_number, email, phone, website,
         price_level, availability_status, available_from, availability_updated_at, team_size, founded_year, project_types,
         status, owner_user_id, is_demo, provider_type)
       values ($1,$2,$3,$4,$5,$6,$7,$8,null,$9,$10,$11, now() - interval '9 days', $12,$13,$14,$15,$16,true,$17) returning id`,
      [
        c.key,
        c.name,
        c.description,
        c.city,
        c.province,
        `${kvk++} (fictief)`,
        `info@${c.key}.demo.bouwcheck.test`,
        null,
        c.priceLevel,
        c.availability,
        c.availableFrom,
        c.teamSize,
        c.founded,
        c.projectTypes,
        status,
        c.key === "kwastenburg" ? contractorUser.id : null,
        c.providerType ?? "bedrijf",
      ],
    );
    ids[c.key] = row.id;
    await tx.query(
      `insert into contractor_private (contractor_id, contact_person_name, contact_person_email, internal_notes) values ($1,$2,$3,$4)`,
      [row.id, "Fictieve contactpersoon", `contact@${c.key}.demo.bouwcheck.test`, "Demoprofiel — geen echte onderneming."],
    );
    for (const [i, s] of c.specialties.entries()) {
      await tx.query("insert into contractor_specialties (contractor_id, specialty_id, is_primary) values ($1,$2,$3)", [row.id, s, i === 0]);
      for (const r of BASE_RATES[s] ?? []) {
        const f = LEVEL_FACTOR[c.priceLevel];
        const round = (v: number) => (v >= 1000 ? Math.round(v / 50) * 50 : v >= 100 ? Math.round(v / 5) * 5 : Math.round(v));
        await tx.query(
          `insert into contractor_rates (contractor_id, specialty_id, description, unit, price_min, price_max, vat_included, materials_included)
           values ($1,$2,$3,$4,$5,$6,false,$7)`,
          [row.id, s, r.description, r.unit, round(r.min * f), round(r.max * f), r.materials],
        );
      }
    }
    for (const a of c.areas) {
      await tx.query("insert into contractor_service_areas (contractor_id, province) values ($1,$2)", [row.id, a]);
    }
    for (const r of c.references) {
      await tx.query(
        `insert into contractor_references (contractor_id, title, city, property_type, renovation_type, year, description, work_items)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row.id, r.title, r.city, r.property_type, r.renovation_type, r.year, r.description, r.work],
      );
    }
    if (c.businessVerified) {
      await tx.query(
        `insert into verification_events (contractor_id, verification_type, status, evidence_reference, notes, reviewed_by, reviewed_at, is_demo)
         values ($1,'bedrijfsgegevens','goedgekeurd','DEMO — fictieve KvK-controle','Demo: er heeft geen echte controle plaatsgevonden.',$2, now() - interval '40 days', true)`,
        [row.id, admin.id],
      );
    }

    // Gegenereerde, fictieve projectresultaten
    const rand = rng(c.key.split("").reduce((a, ch) => a + ch.charCodeAt(0) * 31, 7));
    const p = c.profile;
    const primary = c.specialties[0];
    for (let i = 0; i < p.n; i++) {
      const fromYear = p.fromYear ?? 2023;
      const toYear = p.toYear ?? 2026;
      const spanDays = (toYear - fromYear) * 365 + (toYear === 2026 ? 150 : 300);
      const start = addDays(`${fromYear}-02-01`, Math.floor(rand() * spanDays));
      const duration = Math.max(2, Math.round(TYPICAL_DURATION[primary] * (0.8 + rand() * 0.4)));
      const planned = addDays(start, duration);
      const onTime = (i + 0.5) / p.n <= p.onTime ? rand() > 0.02 : false;
      const actual = onTime ? addDays(planned, -Math.floor(rand() * 4)) : addDays(planned, 5 + Math.floor(rand() * 25));
      const [bMin, bMax] = TYPICAL_BUDGET[primary];
      const initial = Math.round((bMin + rand() * (bMax - bMin)) / 100) * 100;
      const dev = (p.devMean + (rand() - 0.5) * p.devSpread) / 100;
      const final = Math.round((initial * (1 + dev)) / 50) * 50;
      const rework = (i + 0.5) / p.n <= p.rework;
      const vr = (i + 0.5) / p.n;
      const verification = vr <= p.verified ? "documentatie_gecontroleerd" : vr <= p.verified + p.confirmed ? "opdrachtgever_bevestigd" : "niet_gecontroleerd";
      const province = c.areas[Math.floor(rand() * c.areas.length)];
      const cities = CITIES_BY_PROVINCE[province] ?? [c.city];
      const client = clients[Math.floor(rand() * clients.length)];
      const outcome = await one(
        `insert into project_outcomes (contractor_id, submitted_by, source, property_type, renovation_type, city, province, work_specialty_ids,
           start_date, initial_budget, final_cost, amounts_vat_included, extra_costs_reason, planned_completion_date, actual_completion_date,
           rework_required, rework_description, verification_status, evidence_reference, moderation_status, is_demo, created_at, updated_at)
         values ($1,$2,'opdrachtgever',$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13,$14,$15,$16,$17,'goedgekeurd',true,$18,$18) returning id`,
        [
          row.id,
          client.id,
          ["Tussenwoning", "Hoekwoning", "Appartement", "Bovenwoning", "Twee-onder-een-kapwoning"][Math.floor(rand() * 5)],
          c.projectTypes[Math.floor(rand() * c.projectTypes.length)],
          cities[Math.floor(rand() * cities.length)],
          province,
          [primary],
          start,
          initial,
          final,
          dev > 0.05 ? "Meerwerk na sloop: onvoorziene gebreken (fictief voorbeeld)." : null,
          planned,
          actual,
          rework,
          rework ? "Opleverpunten hersteld na oplevering (fictief voorbeeld)." : null,
          verification,
          verification === "documentatie_gecontroleerd" ? `DEMO-DOC-${c.key.toUpperCase()}-${i + 1}` : null,
          `${actual}T12:00:00Z`,
        ],
      );
      if (verification === "documentatie_gecontroleerd") {
        await tx.query(
          `insert into verification_events (contractor_id, project_outcome_id, verification_type, status, evidence_reference, notes, reviewed_by, reviewed_at, is_demo)
           values ($1,$2,'projectgegevens','goedgekeurd',$3,'Demo: fictieve controle van offerte, eindfactuur en opleverdatum.',$4, $5, true)`,
          [row.id, outcome.id, `DEMO-DOC-${c.key.toUpperCase()}-${i + 1}`, admin.id, `${addDays(actual, 14)}T10:00:00Z`],
        );
      }
      if (rand() < p.reviewShare) {
        const base = p.rating + (rand() - 0.5) * 1.6 - (onTime ? 0 : 0.6) - (rework ? 0.4 : 0);
        const rating = Math.min(5, Math.max(1, Math.round(base)));
        const sub = () => Math.min(5, Math.max(1, Math.round(base + (rand() - 0.5) * 1.2)));
        const texts = REVIEW_TEXTS[rating];
        await tx.query(
          `insert into reviews (outcome_id, contractor_id, user_id, rating, quality_rating, communication_rating, reliability_rating, review_text,
             verification_status, moderation_status, is_demo, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'gepubliceerd',true,$10)`,
          [
            outcome.id,
            row.id,
            client.id,
            rating,
            sub(),
            sub(),
            sub(),
            `[Fictieve demo-beoordeling] ${texts[Math.floor(rand() * texts.length)]}`,
            verification === "documentatie_gecontroleerd" ? "gecontroleerd" : verification === "opdrachtgever_bevestigd" ? "opdrachtgever_bevestigd" : "niet_gecontroleerd",
            `${addDays(actual, 10)}T09:00:00Z`,
          ],
        );
      }
    }
  }

  // Betwist resultaat + melding (Polderstaete)
  const disputed = await one(
    `insert into project_outcomes (contractor_id, submitted_by, source, property_type, renovation_type, city, province, work_specialty_ids,
       start_date, initial_budget, final_cost, planned_completion_date, actual_completion_date, rework_required, verification_status,
       moderation_status, is_demo)
     values ($1,$2,'opdrachtgever','Tussenwoning','Complete renovatie','Almere','Flevoland','{hoofdaannemer}','2026-03-02',62000,81000,
       '2026-05-15','2026-07-20',true,'betwist','goedgekeurd',true) returning id`,
    [ids["polderstaete"], clients[2].id],
  );
  await tx.query(
    `insert into flags (entity_type, entity_id, contractor_id, reason, details, reporter_user_id, status)
     values ('projectresultaat',$1,$2,'betwist_resultaat',$3,null,'in_behandeling')`,
    [
      disputed.id,
      ids["polderstaete"],
      "[Demo] De aannemer betwist de opgegeven eindkosten: volgens de aannemer was € 14.000 opdrachtgeverswijziging. Resultaat telt niet mee tot afhandeling.",
    ],
  );
  const lonelyReview = await tx.query<{ id: string }>("select id from reviews where contractor_id = $1 limit 1", [ids["aanrechtwerk"]]);
  if (lonelyReview[0]) {
    await tx.query(
      `insert into flags (entity_type, entity_id, contractor_id, reason, details, reporter_user_id, status)
       values ('review',$1,$2,'verdachte_review',$3,$4,'open')`,
      [lonelyReview[0].id, ids["aanrechtwerk"], "[Demo] Enige beoordeling van dit bedrijf, geplaatst kort na registratie. Graag controleren.", clients[0].id],
    );
  }

  // Openstaand verificatieverzoek (aannemersportaal)
  await tx.query(
    `insert into verification_events (contractor_id, verification_type, status, evidence_reference, notes, requested_by, is_demo)
     values ($1,'bedrijfsgegevens','aangevraagd','KvK 90000008 (fictief)','Aangevraagd via het aannemersportaal (demo).',$2,true)`,
    [ids["kwastenburg"], contractorUser.id],
  );

  // ── Projecten van de demo-flipper ──────────────────────────
  const project = async (p: {
    name: string; location: string; province: string; property: string; renovation: string; area: number; budget: number;
    start: string; end: string; status: string; specialties: string[]; description: string; materials?: string; extra?: string; notes?: string;
  }) => {
    const row = await one(
      `insert into projects (user_id, name, location, province, property_type, renovation_type, area_m2, budget_amount, budget_vat_included,
         desired_start_date, desired_completion_date, status, description, material_preferences, extra_requirements, notes, is_demo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11,$12,$13,$14,$15,true) returning id`,
      [flipper.id, p.name, p.location, p.province, p.property, p.renovation, p.area, p.budget, p.start, p.end, p.status, p.description, p.materials ?? null, p.extra ?? null, p.notes ?? null],
    );
    for (const s of p.specialties) await tx.query("insert into project_specialties (project_id, specialty_id) values ($1,$2)", [row.id, s]);
    return row.id;
  };
  const event = (projectId: string, type: string, message: string, at: string) =>
    tx.query("insert into project_events (project_id, user_id, event_type, message, created_at) values ($1,$2,$3,$4,$5)", [projectId, flipper.id, type, message, at]);
  const shortlist = (projectId: string, key: string, status: string, notes: string | null = null) =>
    tx.query("insert into project_contractors (project_id, contractor_id, status, notes) values ($1,$2,$3,$4)", [projectId, ids[key], status, notes]);

  const p1 = await project({
    name: "Tussenwoning Amersfoort — complete renovatie",
    location: "Amersfoort",
    province: "Utrecht",
    property: "Tussenwoning",
    renovation: "Complete renovatie",
    area: 112,
    budget: 85000,
    start: "2027-01-11",
    end: "2027-04-02",
    status: "offertes",
    specialties: ["hoofdaannemer", "elektricien", "loodgieter", "stukadoor", "schilder"],
    description:
      "Jaren-50 tussenwoning, aangekocht voor renovatie en doorverkoop. Volledige strip van de begane grond, nieuwe elektra en leidingwerk, stucwerk door de hele woning en schilderwerk binnen.",
    materials: "Middensegment, neutraal en verkoopgericht.",
    extra: "Woning moet uiterlijk begin april verkoopklaar zijn in verband met financiering.",
    notes: "Lindewaard is duurder maar heeft de meeste gecontroleerde projectresultaten. Snelbouw kan pas half februari starten.",
  });
  await shortlist(p1, "lindewaard", "offerte_aangevraagd");
  await shortlist(p1, "snelbouw-oost", "offerte_aangevraagd");
  await shortlist(p1, "nieuwe-hoek", "offerte_aangevraagd", "Elektra en loodgieter niet in offerte.");
  await shortlist(p1, "polderstaete", "shortlist");
  await event(p1, "aangemaakt", "Project aangemaakt", "2026-09-14T09:12:00Z");
  await event(p1, "shortlist", "4 aannemers op de shortlist gezet", "2026-09-14T09:40:00Z");
  await event(p1, "offerteaanvraag", "Offerteaanvragen voorbereid voor 3 aannemers (demo — niet extern verzonden)", "2026-09-15T08:30:00Z");
  await event(p1, "offerte", "3 offertes vastgelegd", "2026-10-02T15:10:00Z");

  const p2 = await project({
    name: "Bovenwoning Rotterdam — badkamer en keuken",
    location: "Rotterdam",
    province: "Zuid-Holland",
    property: "Bovenwoning",
    renovation: "Badkamer en/of keuken",
    area: 68,
    budget: 32000,
    start: "2026-12-01",
    end: "2027-01-29",
    status: "orienteren",
    specialties: ["badkamerinstallateur", "tegelzetter", "keukeninstallateur", "loodgieter"],
    description: "Nieuwe badkamer op houten verdiepingsvloer en montage van een nieuwe keuken (keuken wordt zelf aangeschaft).",
    extra: "Werkzaamheden alleen op werkdagen tussen 08:00 en 17:00 i.v.m. VvE-reglement.",
  });
  await shortlist(p2, "waterhoek", "shortlist");
  await shortlist(p2, "mozaiekhof", "shortlist");
  await shortlist(p2, "aanrechtwerk", "shortlist");
  await event(p2, "aangemaakt", "Project aangemaakt", "2026-10-01T10:00:00Z");
  await event(p2, "shortlist", "3 aannemers op de shortlist gezet", "2026-10-01T10:20:00Z");

  const p3 = await project({
    name: "Hoekwoning Eindhoven — verduurzaming",
    location: "Eindhoven",
    province: "Noord-Brabant",
    property: "Hoekwoning",
    renovation: "Verduurzaming",
    area: 130,
    budget: 45000,
    start: "2027-03-01",
    end: "2027-05-14",
    status: "concept",
    specialties: ["isolatiespecialist", "dakdekker", "elektricien"],
    description: "Spouwmuur-, vloer- en dakisolatie en voorbereiding op een hybride warmtepomp (extra groep).",
  });
  await event(p3, "aangemaakt", "Project aangemaakt", "2026-10-10T14:00:00Z");

  const p4 = await project({
    name: "Portiekwoning Utrecht — opknapbeurt",
    location: "Utrecht",
    province: "Utrecht",
    property: "Portiekwoning",
    renovation: "Cosmetische opknapbeurt",
    area: 58,
    budget: 14000,
    start: "2026-06-01",
    end: "2026-07-10",
    status: "opgeleverd",
    specialties: ["stukadoor", "schilder"],
    description: "Stucwerk en schilderwerk in de hele woning voor verhuur.",
  });
  await shortlist(p4, "gladmeer", "geselecteerd");
  await shortlist(p4, "kwastenburg", "geselecteerd");
  await event(p4, "aangemaakt", "Project aangemaakt", "2026-04-20T09:00:00Z");
  await event(p4, "status", "Status gewijzigd naar Opgeleverd", "2026-07-14T16:00:00Z");
  await event(p4, "resultaat", "Projectresultaat geregistreerd voor Stukadoorsbedrijf Gladmeer", "2026-07-20T11:00:00Z");
  await event(p4, "resultaat", "Projectresultaat geregistreerd voor Schildersbedrijf Kwastenburg (in behandeling)", "2026-07-21T11:00:00Z");

  const o1 = await one(
    `insert into project_outcomes (project_id, contractor_id, submitted_by, source, property_type, renovation_type, city, province, work_specialty_ids,
       start_date, initial_budget, final_cost, planned_completion_date, actual_completion_date, rework_required, verification_status, moderation_status, is_demo, created_at, updated_at)
     values ($1,$2,$3,'opdrachtgever','Portiekwoning','Cosmetische opknapbeurt','Utrecht','Utrecht','{stukadoor}','2026-06-01',6200,6450,'2026-06-12','2026-06-11',false,
       'niet_gecontroleerd','goedgekeurd',true,'2026-07-20T11:00:00Z','2026-07-22T11:00:00Z') returning id`,
    [p4, ids["gladmeer"], flipper.id],
  );
  await tx.query(
    `insert into reviews (outcome_id, contractor_id, project_id, user_id, rating, quality_rating, communication_rating, reliability_rating, review_text, verification_status, moderation_status, is_demo, created_at)
     values ($1,$2,$3,$4,4,4,5,4,'[Fictieve demo-beoordeling] Snel en netjes gewerkt; kleine meerprijs voor extra plafond.','niet_gecontroleerd','gepubliceerd',true,'2026-07-20T11:00:00Z')`,
    [o1.id, ids["gladmeer"], p4, flipper.id],
  );
  const o2 = await one(
    `insert into project_outcomes (project_id, contractor_id, submitted_by, source, property_type, renovation_type, city, province, work_specialty_ids,
       start_date, initial_budget, final_cost, planned_completion_date, actual_completion_date, rework_required, rework_description, verification_status, moderation_status, is_demo, created_at, updated_at)
     values ($1,$2,$3,'opdrachtgever','Portiekwoning','Cosmetische opknapbeurt','Utrecht','Utrecht','{schilder}','2026-06-15',5400,5400,'2026-06-26','2026-07-03',true,
       'Twee kozijnen bijgewerkt na oplevering.','niet_gecontroleerd','in_behandeling',true,'2026-07-21T11:00:00Z','2026-07-21T11:00:00Z') returning id`,
    [p4, ids["kwastenburg"], flipper.id],
  );
  await tx.query(
    `insert into reviews (outcome_id, contractor_id, project_id, user_id, rating, quality_rating, communication_rating, reliability_rating, review_text, verification_status, moderation_status, is_demo, created_at)
     values ($1,$2,$3,$4,4,4,4,3,'[Fictieve demo-beoordeling] Mooi resultaat, een week later klaar dan gepland.','niet_gecontroleerd','in_behandeling',true,'2026-07-21T11:00:00Z')`,
    [o2.id, ids["kwastenburg"], p4, flipper.id],
  );

  // ── Offertes ─────────────────────────────────────────────────
  const quote = (q: {
    project: string; key: string; type: string; amount: number; materials: boolean | null; scope: string[]; scopeText: string;
    inclusions?: string; exclusions?: string; days: number | null; start: string | null; validity: string | null; status?: string;
  }) =>
    tx.query(
      `insert into quotes (project_id, contractor_id, price_type, amount, vat_included, materials_included, scope_specialty_ids, scope_description,
         inclusions, exclusions, estimated_duration_days, earliest_start_date, validity_date, status, source, created_by, is_demo)
       values ($1,$2,$3,$4,false,$5,$6,$7,$8,$9,$10,$11,$12,$13,'opdrachtgever',$14,true)`,
      [q.project, ids[q.key], q.type, q.amount, q.materials, q.scope, q.scopeText, q.inclusions ?? null, q.exclusions ?? null, q.days, q.start, q.validity, q.status ?? "ontvangen", flipper.id],
    );
  const fullScope = ["hoofdaannemer", "elektricien", "loodgieter", "stukadoor", "schilder"];
  await quote({
    project: p1, key: "lindewaard", type: "offerte", amount: 78500, materials: true, scope: fullScope,
    scopeText: "Complete renovatie begane grond en verdieping volgens projectomschrijving.",
    inclusions: "Sloop en afvoer, elektra (nieuwe groepenkast), leidingwerk, stucwerk, schilderwerk binnen, projectleiding.",
    days: 56, start: "2027-01-11", validity: "2026-12-15", status: "in_overweging",
  });
  await quote({
    project: p1, key: "snelbouw-oost", type: "offerte", amount: 71200, materials: true, scope: fullScope,
    scopeText: "Complete renovatie volgens projectomschrijving.",
    inclusions: "Sloop, elektra, leidingwerk, stucwerk, schilderwerk. Afvoer via container.",
    days: 35, start: "2027-02-15", validity: "2026-11-30",
  });
  await quote({
    project: p1, key: "nieuwe-hoek", type: "offerte", amount: 59900, materials: true, scope: ["hoofdaannemer", "stukadoor", "schilder"],
    scopeText: "Sloop, timmerwerk, stucwerk en schilderwerk.",
    inclusions: "Sloop, timmerwerk, stucwerk, schilderwerk.",
    exclusions: "Elektra en loodgieterswerk niet inbegrepen (zelf in te kopen). Afvalcontainer op nacalculatie.",
    days: 63, start: "2026-11-02", validity: "2026-11-15",
  });
  await quote({
    project: p2, key: "mozaiekhof", type: "indicatief", amount: 16500, materials: true, scope: ["badkamerinstallateur", "tegelzetter"],
    scopeText: "Indicatie complete badkamer ca. 5 m² incl. tegelwerk, na telefonisch contact.", days: 15, start: "2026-12-14", validity: null,
  });
  await quote({
    project: p2, key: "waterhoek", type: "indicatief", amount: 14800, materials: true, scope: ["badkamerinstallateur", "loodgieter"],
    scopeText: "Indicatie badkamer incl. leidingwerk.", exclusions: "Tegelwerk niet inbegrepen.", days: 12, start: "2026-12-07", validity: null,
  });

  // ── Offerteaanvragen ────────────────────────────────────────
  const qr = (q: { project: string; key: string; status: string; channel: string | null; sent: string | null; spec: string[]; budget: number | null; start: string; end: string; desc: string; notes?: string; response?: string; user?: string; created: string }) =>
    tx.query(
      `insert into quote_requests (project_id, contractor_id, user_id, work_description, specialty_ids, budget_indication, budget_vat_included,
         desired_start_date, desired_completion_date, additional_notes, contact_name, contact_email, contact_phone, status, delivery_channel, sent_at,
         contractor_response, responded_at, is_demo, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,false,$7,$8,$9,'Demo-gebruiker','flipper@demo.bouwcheck.test',null,$10,$11,$12,$13,$14,true,$15,$15)`,
      [q.project, ids[q.key], q.user ?? flipper.id, q.desc, q.spec, q.budget, q.start, q.end, q.notes ?? null, q.status, q.channel, q.sent, q.response ?? null, q.response ? q.sent : null, q.created],
    );
  const d1 = "Complete renovatie tussenwoning (112 m²): strip begane grond, nieuwe elektra en leidingwerk, stucwerk en schilderwerk binnen.";
  await qr({ project: p1, key: "lindewaard", status: "reactie", channel: "demo", sent: "2026-09-15T08:30:00Z", spec: fullScope, budget: 85000, start: "2027-01-11", end: "2027-04-02", desc: d1, created: "2026-09-15T08:20:00Z" });
  await qr({ project: p1, key: "snelbouw-oost", status: "reactie", channel: "demo", sent: "2026-09-15T08:31:00Z", spec: fullScope, budget: 85000, start: "2027-01-11", end: "2027-04-02", desc: d1, created: "2026-09-15T08:21:00Z" });
  await qr({ project: p1, key: "nieuwe-hoek", status: "reactie", channel: "demo", sent: "2026-09-15T08:32:00Z", spec: fullScope, budget: 85000, start: "2027-01-11", end: "2027-04-02", desc: d1, created: "2026-09-15T08:22:00Z" });
  await qr({ project: p1, key: "polderstaete", status: "concept", channel: null, sent: null, spec: fullScope, budget: 85000, start: "2027-01-11", end: "2027-04-02", desc: d1, created: "2026-10-05T12:00:00Z" });
  await qr({ project: p2, key: "waterhoek", status: "concept", channel: null, sent: null, spec: ["badkamerinstallateur", "loodgieter"], budget: 18000, start: "2026-12-01", end: "2027-01-29", desc: "Nieuwe badkamer (ca. 5 m²) op houten verdiepingsvloer, incl. leidingwerk.", created: "2026-10-03T09:00:00Z" });
  await qr({ project: p2, key: "aanrechtwerk", status: "klaar", channel: null, sent: null, spec: ["keukeninstallateur"], budget: 2500, start: "2026-12-15", end: "2027-01-15", desc: "Montage en aansluiten van een zelf aangeschafte keuken (3,2 m rechte opstelling).", created: "2026-10-04T09:00:00Z" });

  // Project + aanvraag van een andere demo-opdrachtgever voor het aannemersportaal
  const otherProject = await one(
    `insert into projects (user_id, name, location, province, property_type, renovation_type, area_m2, budget_amount, desired_start_date, desired_completion_date, status, description, is_demo)
     values ($1,'Demo-project Arnhem — schilderwerk','Arnhem','Gelderland','Tussenwoning','Cosmetische opknapbeurt',95,7000,'2026-11-16','2026-12-04','offertes','Binnenschilderwerk complete woning.',true) returning id`,
    [clients[1].id],
  );
  await tx.query("insert into project_specialties (project_id, specialty_id) values ($1,'schilder')", [otherProject.id]);
  await tx.query("insert into project_contractors (project_id, contractor_id, status) values ($1,$2,'offerte_aangevraagd')", [otherProject.id, ids["kwastenburg"]]);
  await qr({
    project: otherProject.id, key: "kwastenburg", status: "verzonden", channel: "platform", sent: "2026-10-12T10:00:00Z", spec: ["schilder"], budget: 7000,
    start: "2026-11-16", end: "2026-12-04", desc: "Binnenschilderwerk wanden, plafonds en kozijnen (ca. 95 m² woonoppervlak).", user: clients[1].id, created: "2026-10-12T09:50:00Z",
  });

  // ── Favorieten ──────────────────────────────────────────────
  for (const key of ["lindewaard", "mozaiekhof", "vonkenberg"]) {
    await tx.query("insert into favorites (user_id, contractor_id) values ($1,$2)", [flipper.id, ids[key]]);
  }

  // ── Werkzaamheden (scope) van de demoprojecten ───────────────
  const scope = async (projectId: string, items: [string, string, number | null, string | null, string | null][], summary: object | null) => {
    for (const [i, [spec, desc, qty, unit, conf]] of items.entries()) {
      await tx.query(
        "insert into project_scope_items (project_id, specialty_id, description, quantity, unit, confidence, source, position) values ($1,$2,$3,$4,$5,$6,$7,$8)",
        [projectId, spec, desc, qty, unit, conf, conf ? "ai" : "gebruiker", i],
      );
    }
    if (summary) await tx.query("update projects set ai_summary = $2::text::jsonb where id = $1", [projectId, JSON.stringify(summary)]);
  };
  await scope(
    p1,
    [
      ["hoofdaannemer", "Regie en uitvoering complete renovatie (casco t/m afwerking)", 112, "m2", "middel"],
      ["sloopwerk", "Strippen begane grond incl. afvoer", 56, "m2", "middel"],
      ["elektricien", "Nieuwe groepenkast", 1, "stuk", "hoog"],
      ["elektricien", "Extra aansluitpunten (wcd/lichtpunten)", 18, "stuk", "laag"],
      ["loodgieter", "Vervangen leidingwerk woning", 1, "project", "middel"],
      ["stukadoor", "Wanden en plafonds sausklaar stucen", 260, "m2", "laag"],
      ["schilder", "Binnenschilderwerk wanden en plafonds", 260, "m2", "laag"],
    ],
    {
      summary: "[Demo] Jaren-50 tussenwoning, ca. 112 m², volledige renovatie van de begane grond met nieuwe installaties en afwerking door de hele woning.",
      property_condition: "[Demo] Verouderde elektra (geen aardlekschakelaars zichtbaar), stucwerk met scheuren, kozijnen redelijk.",
      risks: ["Mogelijk asbest in oude vloerbedekking of leidingisolatie (jaren-50)", "Draagkracht van te verwijderen wanden onbekend"],
      open_questions: ["Is er een asbestinventarisatie beschikbaar?", "Blijft de bestaande keuken behouden?"],
      assumptions: ["Wand- en plafondoppervlak geschat op basis van 112 m² woonoppervlak"],
      demo: true,
    },
  );
  await scope(
    p2,
    [
      ["badkamerinstallateur", "Complete badkamer ca. 5 m² incl. sanitair", 1, "project", "hoog"],
      ["tegelzetter", "Wandtegels badkamer zetten", 22, "m2", "middel"],
      ["tegelzetter", "Vloertegels badkamer zetten", 5, "m2", "middel"],
      ["keukeninstallateur", "Keuken monteren en aansluiten (keuken zelf aangeschaft)", 1, "project", "hoog"],
    ],
    {
      summary: "[Demo] Nieuwe badkamer op houten verdiepingsvloer en montage van een zelf aangeschafte keuken.",
      property_condition: "[Demo] Houten verdiepingsvloer; waterdichting en draagkracht aandachtspunt.",
      risks: ["Houten vloer vraagt extra waterdichting en mogelijk versteviging"],
      open_questions: ["Mag er volgens het VvE-reglement een inloopdouche worden geplaatst?"],
      assumptions: [],
      demo: true,
    },
  );
  await scope(
    p3,
    [
      ["isolatiespecialist", "Spouwmuurisolatie", 95, "m2", "middel"],
      ["isolatiespecialist", "Vloerisolatie kruipruimte", 60, "m2", "middel"],
      ["dakdekker", "Pannendak vernieuwen incl. isolatie", 70, "m2", "laag"],
      ["elektricien", "Extra groep / aansluitpunt voor hybride warmtepomp", 2, "stuk", "middel"],
    ],
    null,
  );
  await scope(p4, [
    ["stukadoor", "Wanden sausklaar", 140, "m2", null],
    ["schilder", "Binnenschilderwerk", 140, "m2", null],
  ], null);

  // ── Registercontrole (fictieve voorbeelden) ────────────────
  // Demo-uitvoerders hebben fictieve KvK-nummers en worden nooit in echte registers gezocht.
  // Deze rijen laten alleen zien hoe uitsluiting, waarschuwing en beoordeling werken.
  const demoCheck = async (key: string, summary: string, findings: number) =>
    one(
      `insert into register_checks (contractor_id, status, kvk_number, kvk_confirmed, summary, sources_checked, findings_count, model, requested_by, is_demo, created_at)
       values ($1,'voltooid',null,false,$2,'[{"name":"Voorbeeld — geen echte controle","url":"https://www.kvk.nl/"}]'::jsonb,$3,'demo',$4,true, now() - interval '12 days') returning id`,
      [ids[key], summary, findings, admin.id],
    );
  const stalCheck = await demoCheck("gebroeders-stal", "[Demo] Fictieve controle: voorbeeld van een uitsluitend registersignaal.", 1);
  await tx.query(
    `insert into register_signals (contractor_id, check_id, kind, effect, match_basis, title, summary, source_name, source_url, event_date, status, reviewed_by, reviewed_at, review_note, is_demo)
     values ($1,$2,'faillissement','uitsluiting','kvk_nummer','[Demo] Faillissement uitgesproken (fictief)',
       'Fictief voorbeeld: de rechtbank heeft het faillissement van deze onderneming uitgesproken. Er bestaat geen echte onderneming met deze naam.',
       'Centraal Insolventieregister (demo — fictief)','https://insolventies.rechtspraak.nl/', current_date - 30,'goedgekeurd',$3, now() - interval '11 days','Demo: fictief voorbeeld',true)`,
    [ids["gebroeders-stal"], stalCheck.id, admin.id],
  );
  const henkCheck = await demoCheck("handige-henk", "[Demo] Fictieve controle: voorbeeld van een waarschuwing.", 1);
  await tx.query(
    `insert into register_signals (contractor_id, check_id, kind, effect, match_basis, title, summary, source_name, source_url, event_date, status, reviewed_by, reviewed_at, review_note,
       contractor_response, responded_at, is_demo)
     values ($1,$2,'doorstart_zelfde_adres','waarschuwing','naam_en_adres','[Demo] Eerdere onderneming op hetzelfde adres (fictief)',
       'Fictief voorbeeld: op hetzelfde vestigingsadres stond tot 2021 een andere eenmanszaak ingeschreven.',
       'KvK Handelsregister (demo — fictief)','https://www.kvk.nl/', '2021-03-01','goedgekeurd',$3, now() - interval '11 days','Demo: fictief voorbeeld',
       '[Demo] Dat was mijn vorige eenmanszaak; die is netjes uitgeschreven zonder schulden.', now() - interval '9 days', true)`,
    [ids["handige-henk"], henkCheck.id, admin.id],
  );
  const klusmaatCheck = await demoCheck("klusmaat-arnhem", "[Demo] Fictieve controle: voorbeeld van een voorstel dat nog beoordeeld moet worden.", 2);
  await tx.query(
    `insert into register_signals (contractor_id, check_id, kind, effect, match_basis, title, summary, source_name, source_url, event_date, status, is_demo) values
     ($1,$2,'jonge_inschrijving','waarschuwing','kvk_nummer','[Demo] Inschrijving jonger dan een jaar (fictief)',
       'Fictief voorbeeld: de onderneming is minder dan een jaar geleden ingeschreven.', 'KvK Handelsregister (demo — fictief)','https://www.kvk.nl/', current_date - 120,'voorgesteld',true),
     ($1,$2,'rechterlijke_uitspraak','waarschuwing','naam','[Demo] Uitspraak over een onderneming met een vergelijkbare naam (fictief)',
       'Fictief voorbeeld: alleen op naam gevonden; mogelijk een andere onderneming.', 'Rechtspraak.nl (demo — fictief)','https://uitspraken.rechtspraak.nl/', current_date - 400,'voorgesteld',true)`,
    [ids["klusmaat-arnhem"], klusmaatCheck.id],
  );

  // ── Leads & beheerlog ───────────────────────────────────────
  await tx.query(
    `insert into interest_leads (lead_type, name, email, company, message, status) values
     ('pro','Demo-lead A','lead-a@demo.bouwcheck.test','Fictieve Vastgoed B.V.','[Demo] Interesse in Pro voor 4–6 projecten per jaar.','nieuw'),
     ('renovatieselectie','Demo-lead B','lead-b@demo.bouwcheck.test',null,'[Demo] Graag selectie voor renovatie in Zwolle.','opgevolgd')`,
    [],
  );
  await tx.query(
    `insert into admin_actions (admin_user_id, action, entity_type, entity_id, details, created_at) values
     ($1,'aannemer_gedeactiveerd','aannemer',$2,'{"reden":"Demo: profiel offline gehaald na herhaalde onjuiste gegevens"}', now() - interval '20 days'),
     ($1,'resultaat_goedgekeurd','projectresultaat',$3,'{}', now() - interval '3 days')`,
    [admin.id, ids["stroomlijn"], o1.id],
  );
}
