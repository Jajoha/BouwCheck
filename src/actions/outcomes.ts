"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sqlOne, transaction } from "@/lib/db";
import { assertUser, AuthError, FLIPPER_ROLES } from "@/lib/auth/session";
import { addProjectEvent, getProjectForUser } from "@/lib/data/projects";
import { outcomeSchema, parseForm } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

/**
 * Registreert een projectresultaat + ervaring van de opdrachtgever.
 * Waarborgen tegen manipulatie:
 * - alleen voor een eigen project, met een aannemer die op de shortlist staat;
 * - maximaal één resultaat per aannemer per project (unieke index);
 * - status 'in behandeling': telt pas mee na beoordeling door beheer;
 * - verificatiestatus start altijd op 'niet gecontroleerd'.
 */
export async function submitOutcomeAction(fd: FormData): Promise<ActionResult> {
  let projectId: string;
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const parsed = parseForm(outcomeSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const d = parsed.data;
    const project = await getProjectForUser(d.project_id, user);
    if (!project) return { ok: false, message: "Project niet gevonden." };
    projectId = project.id;
    const link = await sqlOne<{ company_name: string }>(
      `select c.company_name from project_contractors pc join contractors c on c.id = pc.contractor_id
        where pc.project_id = $1 and pc.contractor_id = $2`,
      [project.id, d.contractor_id],
    );
    if (!link) return { ok: false, fieldErrors: { contractor_id: ["Je kunt alleen resultaten registreren voor aannemers die aan dit project gekoppeld zijn."] } };
    const existing = await sqlOne("select 1 from project_outcomes where project_id = $1 and contractor_id = $2", [project.id, d.contractor_id]);
    if (existing) return { ok: false, message: "Voor deze aannemer is al een resultaat geregistreerd bij dit project. Neem contact op met beheer voor een correctie." };

    await transaction(async (tx) => {
      const [outcome] = await tx.query<{ id: string }>(
        `insert into project_outcomes (project_id, contractor_id, submitted_by, source, property_type, renovation_type, city, province, work_specialty_ids,
           start_date, initial_budget, final_cost, amounts_vat_included, extra_costs_reason, planned_completion_date, actual_completion_date,
           rework_required, rework_description, evidence_reference, verification_status, moderation_status)
         values ($1,$2,$3,'opdrachtgever',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'niet_gecontroleerd','in_behandeling') returning id`,
        [project.id, d.contractor_id, user.id, project.property_type, project.renovation_type, project.location, project.province, d.work_specialty_ids,
          d.start_date ?? null, d.initial_budget ?? null, d.final_cost ?? null, d.amounts_vat_included, d.extra_costs_reason ?? null,
          d.planned_completion_date ?? null, d.actual_completion_date ?? null, d.rework_required, d.rework_description ?? null, d.evidence_reference ?? null],
      );
      await tx.query(
        `insert into reviews (outcome_id, contractor_id, project_id, user_id, rating, quality_rating, communication_rating, reliability_rating, review_text)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [outcome.id, d.contractor_id, project.id, user.id, d.rating, d.quality_rating ?? null, d.communication_rating ?? null, d.reliability_rating ?? null, d.review_text],
      );
      await addProjectEvent(tx, project.id, user.id, "resultaat", `Projectresultaat geregistreerd voor ${link.company_name} (in behandeling bij beheer)`);
    });
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath(`/projecten/${projectId}`);
  redirect(`/projecten/${projectId}?melding=resultaat-geregistreerd`);
}
