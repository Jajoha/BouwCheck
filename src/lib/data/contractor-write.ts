import "server-only";
import type { z } from "zod";
import type { Queryable } from "@/lib/db";
import type { contractorProfileSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

/** Schrijft een aannemersprofiel (portaal en beheer). Alleen aanroepen na autorisatie. */
export async function writeContractorProfile(
  tx: Queryable,
  contractorId: string | null,
  d: z.infer<typeof contractorProfileSchema>,
  extra: { ownerUserId?: string | null; status?: string; isDemo?: boolean },
): Promise<string> {
  let id = contractorId;
  if (!id) {
    let slug = slugify(d.company_name) || "aannemer";
    const taken = await tx.query("select 1 from contractors where slug = $1", [slug]);
    if (taken.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await tx.query<{ id: string }>(
      `insert into contractors (slug, company_name, description, city, hq_province, kvk_number, email, phone, website, price_level,
         availability_status, available_from, availability_updated_at, team_size, founded_year, project_types, status, owner_user_id, is_demo, provider_type)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), $13,$14,$15,$16,$17,$18,$19) returning id`,
      [slug, d.company_name, d.description, d.city, d.hq_province, d.kvk_number ?? null, d.email ?? null, d.phone ?? null, d.website ?? null,
        d.price_level, d.availability_status, d.available_from ?? null, d.team_size ?? null, d.founded_year ?? null, d.project_types,
        extra.status ?? "in_beoordeling", extra.ownerUserId ?? null, extra.isDemo ?? false, d.provider_type],
    );
    id = row.id;
  } else {
    await tx.query(
      `update contractors set company_name=$2, description=$3, city=$4, hq_province=$5, kvk_number=$6, email=$7, phone=$8, website=$9,
         price_level=$10, availability_status=$11, available_from=$12, availability_updated_at = now(), team_size=$13, founded_year=$14,
         project_types=$15, provider_type=$16, updated_at=now() where id=$1`,
      [id, d.company_name, d.description, d.city, d.hq_province, d.kvk_number ?? null, d.email ?? null, d.phone ?? null, d.website ?? null,
        d.price_level, d.availability_status, d.available_from ?? null, d.team_size ?? null, d.founded_year ?? null, d.project_types, d.provider_type],
    );
    await tx.query("delete from contractor_specialties where contractor_id = $1", [id]);
    await tx.query("delete from contractor_service_areas where contractor_id = $1", [id]);
  }
  const primary = d.primary_specialty && d.specialty_ids.includes(d.primary_specialty) ? d.primary_specialty : d.specialty_ids[0];
  for (const s of d.specialty_ids) {
    await tx.query("insert into contractor_specialties (contractor_id, specialty_id, is_primary) values ($1,$2,$3)", [id, s, s === primary]);
  }
  for (const a of d.areas) await tx.query("insert into contractor_service_areas (contractor_id, province) values ($1,$2)", [id, a]);
  return id;
}

