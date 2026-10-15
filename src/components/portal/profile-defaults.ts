/** Gedeelde (niet-client) standaardwaarden voor het aannemersprofielformulier. */
export type ContractorProfileValues = {
  company_name: string;
  description: string;
  city: string;
  hq_province: string;
  kvk_number: string;
  email: string;
  phone: string;
  website: string;
  price_level: string;
  availability_status: string;
  available_from: string;
  team_size: string;
  founded_year: string;
  project_types: string[];
  specialty_ids: string[];
  primary_specialty: string;
  areas: string[];
  status?: string;
};

export const emptyContractorProfile: ContractorProfileValues = {
  company_name: "",
  description: "",
  city: "",
  hq_province: "",
  kvk_number: "",
  email: "",
  phone: "",
  website: "",
  price_level: "onbekend",
  availability_status: "onbekend",
  available_from: "",
  team_size: "",
  founded_year: "",
  project_types: [],
  specialty_ids: [],
  primary_specialty: "",
  areas: [],
};
