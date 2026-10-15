import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { sql, sqlOne } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, newToken } from "./password";
import type { UserRole } from "@/lib/domain/constants";

const COOKIE = "bc_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_name: string | null;
  region: string | null;
  project_types: string[];
  onboarded_at: string | null;
  is_demo: boolean;
};

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sql("insert into sessions (id, user_id, expires_at) values ($1, $2, $3)", [hashToken(token), userId, expires]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction && env.appUrl.startsWith("https"),
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql("delete from sessions where id = $1", [hashToken(token)]);
  jar.delete(COOKIE);
}

/**
 * Huidige gebruiker. Bewust niet per request gecachet: een server action kan de
 * rol wijzigen en daarna in hetzelfde request een nieuwe pagina renderen.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const user = await sqlOne<SessionUser>(
    `select u.id, u.email, u.name, u.role, u.company_name, u.region, u.project_types,
            u.onboarded_at::text as onboarded_at, u.is_demo
       from sessions s join users u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now() and u.is_active`,
    [hashToken(token)],
  );
  return user;
}

/** Vereist een ingelogde gebruiker; stuurt anders door naar inloggen. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/inloggen${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** Vereist een van de opgegeven rollen. Server-side afgedwongen. */
export async function requireRole(roles: UserRole[], next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) notFound();
  return user;
}

export const requireAdmin = (next?: string) => requireRole(["beheerder"], next);

export class AuthError extends Error {}

/** Voor server actions: gooit in plaats van te redirecten. */
export async function assertUser(roles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Je bent niet ingelogd.");
  if (roles && !roles.includes(user.role)) throw new AuthError("Je hebt geen toegang tot deze actie.");
  return user;
}

export const FLIPPER_ROLES: UserRole[] = ["flipper", "investeerder", "beheerder"];

/** Voor de flipper-omgeving: aannemers gaan naar hun portaal, niet-onboarde gebruikers naar onboarding. */
export async function requireFlipper(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.role === "aannemer") redirect("/portaal");
  if (!user.onboarded_at) redirect("/onboarding");
  return user;
}
