const eur0 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const num1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

export function formatEuro(amount: number | null | undefined, opts?: { cents?: boolean }) {
  if (amount == null || Number.isNaN(amount)) return "Onbekend";
  return (opts?.cents ? eur2 : eur0).format(amount);
}

/** Bedrag met expliciete btw-vermelding, bijv. "€ 78.500 (zonder btw)". */
export function formatMoney(amount: number | null | undefined, vatIncluded: boolean, opts?: { cents?: boolean }) {
  if (amount == null) return "Onbekend";
  return `${formatEuro(amount, opts)} ${vatIncluded ? "(met btw)" : "(zonder btw)"}`;
}

export function formatNumber(n: number | null | undefined, decimals: 0 | 1 = 0) {
  if (n == null) return "Onbekend";
  return (decimals ? num1 : num0).format(n);
}

export function formatPercent(n: number | null | undefined, opts?: { signed?: boolean }) {
  if (n == null) return "Onbekend";
  const s = num1.format(Math.abs(n) < 0.05 ? 0 : n);
  return `${opts?.signed && n > 0.05 ? "+" : ""}${s}%`;
}

const MONTHS = ["jan.", "feb.", "mrt.", "apr.", "mei", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];

/** 'YYYY-MM-DD' of Date → "15 okt. 2026" (zonder tijdzoneverschuiving voor datums). */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Onbekend";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Onbekend";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

export function formatDays(days: number | null | undefined) {
  if (days == null) return "Onbekend";
  const r = Math.round(days);
  if (Math.abs(r) >= 14 && r % 7 === 0) return `${r / 7} weken`;
  return `${r} ${Math.abs(r) === 1 ? "dag" : "dagen"}`;
}

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
