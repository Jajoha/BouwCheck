"use server";

import { redirect } from "next/navigation";
import { sql, sqlOne } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword, newToken, hashToken } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { loginSchema, onboardingSchema, parseForm, registerSchema, resetPasswordSchema, resetRequestSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

// Eenvoudige rem op brute-force-pogingen (per proces, per e-mailadres).
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function isLocked(key: string) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}
function registerFailure(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else a.count++;
}

function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function homeFor(role: string) {
  return role === "aannemer" ? "/portaal" : role === "beheerder" ? "/beheer" : "/dashboard";
}

export async function loginAction(fd: FormData): Promise<ActionResult> {
  const parsed = parseForm(loginSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, password, next } = parsed.data;
  if (isLocked(email)) return { ok: false, message: "Te veel inlogpogingen. Probeer het over 15 minuten opnieuw." };
  const user = await sqlOne<{ id: string; password_hash: string; role: string; onboarded_at: string | null; is_active: boolean }>(
    "select id, password_hash, role, onboarded_at::text as onboarded_at, is_active from users where email = $1",
    [email],
  );
  if (!user || !(await verifyPassword(password, user.password_hash)) || !user.is_active) {
    registerFailure(email);
    return { ok: false, message: "E-mailadres of wachtwoord is onjuist.", fieldErrors: { password: ["E-mailadres of wachtwoord is onjuist."] } };
  }
  attempts.delete(email);
  await createSession(user.id);
  redirect(user.onboarded_at ? safeNext(next, homeFor(user.role)) : "/onboarding");
}

/** Alleen beschikbaar in demo-modus: inloggen als vooraf aangemaakt demo-account. */
export async function demoLoginAction(role: "flipper" | "admin" | "contractor"): Promise<ActionResult> {
  if (!env.demoMode) return { ok: false, message: "Demo-accounts zijn uitgeschakeld in deze omgeving." };
  const user = await sqlOne<{ id: string; role: string; password_hash: string }>(
    "select id, role, password_hash from users where email = $1 and is_demo",
    [DEMO_ACCOUNTS[role]],
  );
  if (!user || !(await verifyPassword(DEMO_PASSWORD, user.password_hash))) {
    return { ok: false, message: "Demo-account niet gevonden. Herlaad de demo-data via `npm run db:reset`." };
  }
  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function registerAction(fd: FormData): Promise<ActionResult> {
  const parsed = parseForm(registerSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { name, email, password } = parsed.data;
  const exists = await sqlOne("select 1 from users where email = $1", [email]);
  if (exists) return { ok: false, fieldErrors: { email: ["Er bestaat al een account met dit e-mailadres."] } };
  const [user] = await sql<{ id: string }>(
    "insert into users (email, name, password_hash, role) values ($1,$2,$3,'flipper') returning id",
    [email, name, await hashPassword(password)],
  );
  await createSession(user.id);
  redirect(fd.get("rol") === "aannemer" ? "/onboarding?rol=aannemer" : "/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/?melding=uitgelogd");
}

export async function onboardingAction(fd: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");
  const parsed = parseForm(onboardingSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  // Beheerders behouden hun rol; de rol 'beheerder' is nooit zelf te kiezen.
  const role = user.role === "beheerder" ? "beheerder" : d.role;
  await sql(
    "update users set name = $2, company_name = $3, role = $4, region = $5, project_types = $6, onboarded_at = coalesce(onboarded_at, now()), updated_at = now() where id = $1",
    [user.id, d.name, d.company_name ?? null, role, d.region ?? null, d.project_types],
  );
  if (user.onboarded_at && role === user.role) return { ok: true, message: "Profiel opgeslagen." };
  redirect(`${homeFor(role)}?melding=welkom`);
}

export async function requestPasswordResetAction(fd: FormData): Promise<ActionResult<{ devLink?: string }>> {
  const parsed = parseForm(resetRequestSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const user = await sqlOne<{ id: string }>("select id from users where email = $1 and is_active", [parsed.data.email]);
  if (!env.emailConfigured && !env.demoMode) {
    return {
      ok: false,
      message: "E-mailverzending is in deze omgeving nog niet geconfigureerd. Neem contact op met de beheerder om je wachtwoord te herstellen.",
    };
  }
  let devLink: string | undefined;
  if (user) {
    const token = newToken();
    await sql("insert into password_reset_tokens (id, user_id, expires_at) values ($1,$2, now() + interval '1 hour')", [hashToken(token), user.id]);
    if (env.demoMode) devLink = `/wachtwoord-herstellen?token=${token}`;
  }
  return {
    ok: true,
    message: "Als dit e-mailadres bij ons bekend is, is er een herstellink aangemaakt.",
    data: { devLink },
  };
}

export async function resetPasswordAction(fd: FormData): Promise<ActionResult> {
  const parsed = parseForm(resetPasswordSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: parsed.fieldErrors.token ? "Ongeldige herstellink." : undefined };
  const row = await sqlOne<{ user_id: string }>(
    "select user_id from password_reset_tokens where id = $1 and used_at is null and expires_at > now()",
    [hashToken(parsed.data.token)],
  );
  if (!row) return { ok: false, message: "Deze herstellink is ongeldig of verlopen. Vraag een nieuwe aan." };
  await sql("update users set password_hash = $2, updated_at = now() where id = $1", [row.user_id, await hashPassword(parsed.data.password)]);
  await sql("update password_reset_tokens set used_at = now() where id = $1", [hashToken(parsed.data.token)]);
  await sql("delete from sessions where user_id = $1", [row.user_id]);
  redirect("/inloggen?melding=wachtwoord-gewijzigd");
}
