import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { RetryEmailButton, TestEmailForm } from "@/components/admin/email-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { emailConfig } from "@/lib/email";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — e-mail" };

const TONES = {
  verzonden: "positive",
  gepland: "info",
  bezig: "info",
  niet_geconfigureerd: "warning",
  mislukt: "danger",
  geannuleerd: "muted",
} as const;

type Row = { id: string; to_email: string; kind: string; template: string; subject: string; status: keyof typeof TONES; send_after: string; sent_at: string | null; error_message: string | null };

export default async function AdminEmail() {
  const user = await requireAdmin("/beheer/e-mail");
  const rows = await sql<Row>(
    "select id, to_email, kind, template, subject, status, send_after::text, sent_at::text, error_message from email_messages order by created_at desc limit 200",
  );
  return (
    <>
      <PageHeader
        title="E-mail"
        description="Alle uitgaande mails staan eerst in deze outbox. Opvolgmails gaan alleen naar mensen met toestemming en zonder afmelding; geplande mails worden dagelijks door de cron verstuurd."
      />
      {emailConfig.configured ? (
        <Notice tone="success" className="mt-4">
          Verzending actief via Resend, afzender <code>{emailConfig.from}</code>.
        </Notice>
      ) : (
        <Notice tone="warning" className="mt-4" title="E-mail niet geconfigureerd">
          Zet <code>RESEND_API_KEY</code> en <code>EMAIL_FROM</code> (een adres op een bij Resend geverifieerd domein) en deploy opnieuw. Tot die tijd krijgen mails de
          status <em>niet geconfigureerd</em> en worden ze niet verstuurd.
        </Notice>
      )}
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
        <TestEmailForm defaultTo={user.email} />
      </div>
      <h2 className="mt-10 text-base font-semibold">Outbox (laatste 200)</h2>
      {rows.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen e-mails" />
      ) : (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className={th}>Gepland</th>
                <th className={th}>Aan</th>
                <th className={th}>Onderwerp</th>
                <th className={th}>Soort</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} text-xs`}>
                    {formatDateTime(r.send_after)}
                    {r.sent_at ? <span className="block text-ink-500">verzonden {formatDateTime(r.sent_at)}</span> : null}
                  </td>
                  <td className={td}>{r.to_email}</td>
                  <td className={td}>
                    {r.subject}
                    <span className="block text-xs text-ink-500">{r.template}</span>
                  </td>
                  <td className={`${td} text-xs`}>{r.kind}</td>
                  <td className={td}>
                    <Badge tone={TONES[r.status]}>{r.status.replace("_", " ")}</Badge>
                    {r.error_message ? <span className="mt-1 block max-w-xs text-xs text-ink-500">{r.error_message}</span> : null}
                  </td>
                  <td className={td}>{r.status === "niet_geconfigureerd" || r.status === "mislukt" ? <RetryEmailButton id={r.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
