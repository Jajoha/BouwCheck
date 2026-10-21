/**
 * Pure e-mailopmaak en verzendbeleid (geen I/O), zodat dit los te testen is.
 */

export type EmailKind = "transactioneel" | "opvolging";

export type EmailContent = {
  /** Kopregel in de mail. */
  heading: string;
  /** Alinea's platte tekst; worden ge-escaped. */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Kleine tekst onder de knop (bijv. een disclaimer). */
  footnote?: string;
};

export type RenderedEmail = { html: string; text: string };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Eenvoudige, robuuste opmaak die in alle mailclients werkt (tabellen + inline styles). */
export function renderEmail(content: EmailContent, opts: { brand: string; unsubscribeUrl?: string }): RenderedEmail {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1b1f23">${escapeHtml(t)}</p>`;
  const button = content.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(content.cta.url)}" style="display:inline-block;background:#1f4fd1;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">${escapeHtml(content.cta.label)}</a></p>`
    : "";
  const footnote = content.footnote ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5b6470">${escapeHtml(content.footnote)}</p>` : "";
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:24px 0 0;font-size:12px;color:#8a929c">Geen mails meer over dit onderwerp? <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#5b6470">Afmelden</a>.</p>`
    : "";
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<tr><td style="padding:28px 28px 8px;font-size:14px;font-weight:700;color:#1b1f23">${escapeHtml(opts.brand)}</td></tr>
<tr><td style="padding:8px 28px 28px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1b1f23">${escapeHtml(content.heading)}</h1>
${content.paragraphs.map(p).join("\n")}
${button}
${footnote}
${unsubscribe}
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    content.heading,
    "",
    ...content.paragraphs.flatMap((t) => [t, ""]),
    ...(content.cta ? [`${content.cta.label}: ${content.cta.url}`, ""] : []),
    ...(content.footnote ? [content.footnote, ""] : []),
    ...(opts.unsubscribeUrl ? [`Afmelden: ${opts.unsubscribeUrl}`] : []),
    "",
    `— ${opts.brand}`,
  ].join("\n");
  return { html, text };
}

/**
 * Mag dit bericht in de wachtrij? Opvolgmails alleen met toestemming en zonder afmelding.
 * Transactionele mails (bijv. "je rapport staat klaar") horen bij de gevraagde dienst.
 */
export function mayQueueEmail(kind: EmailKind, opts: { consent: boolean; unsubscribed: boolean }): boolean {
  if (kind === "transactioneel") return true;
  return opts.consent && !opts.unsubscribed;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
