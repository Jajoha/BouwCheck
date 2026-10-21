"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Loader2, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { registerBlobFileAction, startOffertecheckAction, submitOffertecheckAction } from "@/actions/offertecheck";
import { PROVINCES } from "@/lib/domain/constants";
import { OFFERTECHECK_MAX_BYTES, OFFERTECHECK_MAX_FILES } from "@/lib/domain/offertecheck";

type Picked = { id: string; file: File; state: "wacht" | "bezig" | "klaar" | "fout"; progress: number; error?: string };

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const MAX_EDGE = 1568; // het model verkleint grotere afbeeldingen toch
const BIG_IMAGE = 3 * 1024 * 1024;

/** Grote foto's van offertes worden in de browser verkleind tot JPEG; pdf's blijven ongewijzigd. */
async function prepare(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  if (file.size < BIG_IMAGE && Math.max(bitmap.width, bitmap.height) <= MAX_EDGE) {
    bitmap.close();
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

const extFor = (type: string) => (type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg");
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

export function OffertecheckForm({ uploadMode }: { uploadMode: "blob" | "server" }) {
  const [files, setFiles] = React.useState<Picked[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [busy, setBusy] = React.useState(false);
  const concept = React.useRef<{ checkId: string; secret: string } | null>(null);
  // Na het aanmaken van het concept liggen de gegevens vast; alleen bestanden kunnen nog veranderen
  const [locked, setLocked] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<Picked>) => setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  async function add(list: FileList | null) {
    if (!list?.length) return;
    const errors: string[] = [];
    const room = OFFERTECHECK_MAX_FILES - files.length;
    const added: Picked[] = [];
    for (const raw of [...list]) {
      if (added.length >= room) {
        errors.push(`Maximaal ${OFFERTECHECK_MAX_FILES} bestanden.`);
        break;
      }
      if (!ACCEPT.includes(raw.type)) {
        errors.push(`${raw.name}: alleen pdf, jpg of png.`);
        continue;
      }
      const file = await prepare(raw).catch(() => raw);
      if (file.size > OFFERTECHECK_MAX_BYTES) {
        errors.push(`${raw.name} is groter dan 15 MB.`);
        continue;
      }
      added.push({ id: crypto.randomUUID(), file, state: "wacht", progress: 0 });
    }
    setFiles((f) => [...f, ...added]);
    setFieldErrors((e) => ({ ...e, files: errors }));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadOne(p: Picked, c: { checkId: string; secret: string }) {
    update(p.id, { state: "bezig", progress: 0, error: undefined });
    try {
      if (uploadMode === "blob") {
        const { upload } = await import("@vercel/blob/client");
        const pathname = `offertechecks/${c.checkId}/${crypto.randomUUID()}.${extFor(p.file.type)}`;
        await upload(pathname, p.file, {
          access: "private",
          handleUploadUrl: "/api/offertecheck/upload",
          clientPayload: JSON.stringify(c),
          contentType: p.file.type,
          multipart: p.file.size > 5 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => update(p.id, { progress: percentage }),
        });
        const res = await registerBlobFileAction({ ...c, pathname, bestandsnaam: p.file.name });
        if (!res.ok) throw new Error(res.message ?? "Upload mislukt");
      } else {
        const fd = new FormData();
        fd.set("checkId", c.checkId);
        fd.set("secret", c.secret);
        fd.set("file", p.file);
        const res = await fetch("/api/offertecheck/bestand", { method: "POST", body: fd });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload mislukt");
      }
      update(p.id, { state: "klaar", progress: 100 });
      return true;
    } catch (err) {
      update(p.id, { state: "fout", error: err instanceof Error ? err.message : "Upload mislukt" });
      return false;
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!files.length) {
      setFieldErrors({ files: ["Voeg minimaal één offerte toe."] });
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (!concept.current) {
        const res = await startOffertecheckAction(new FormData(event.currentTarget));
        if (!res.ok || !res.data) {
          setFieldErrors(res.fieldErrors ?? {});
          if (res.message) toast.error(res.message);
          const first = res.fieldErrors ? Object.keys(res.fieldErrors)[0] : null;
          if (first) event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
          return;
        }
        concept.current = res.data;
        setLocked(true);
        setFieldErrors({});
      }
      const todo = files.filter((f) => f.state !== "klaar");
      let allOk = true;
      for (const f of todo) allOk = (await uploadOne(f, concept.current)) && allOk;
      if (!allOk) {
        toast.error("Niet alle bestanden zijn geüpload. Verwijder of probeer de mislukte bestanden opnieuw.");
        return;
      }
      const res = await submitOffertecheckAction(concept.current.checkId, concept.current.secret);
      if (res && !res.ok) {
        toast.error(res.message ?? "Indienen mislukt.");
        if (res.message?.includes("verlopen")) {
          concept.current = null;
          setLocked(false);
          setFiles((l) => l.map((f) => ({ ...f, state: "wacht" as const, progress: 0 })));
        }
      }
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
      console.error(err);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  const err = (name: string) => fieldErrors[name];
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div>
        <p className="text-sm font-medium text-ink-800">
          Offertes <span className="text-danger-600" aria-hidden>*</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-500">1 tot 5 bestanden · pdf, jpg of png · max. 15 MB per bestand</p>
        <ul className="mt-3 flex flex-col gap-2" aria-label="Gekozen bestanden">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm">
              {f.file.type === "application/pdf" ? <FileText className="size-4 shrink-0 text-ink-500" aria-hidden /> : <ImageIcon className="size-4 shrink-0 text-ink-500" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-900">{f.file.name}</span>
                <span className="block text-xs text-ink-500">
                  {mb(f.file.size)}
                  {f.state === "bezig" ? ` · uploaden ${Math.round(f.progress)}%` : null}
                  {f.state === "fout" ? <span className="text-danger-700"> · {f.error}</span> : null}
                </span>
              </span>
              {f.state === "bezig" ? <Loader2 className="size-4 animate-spin text-ink-500" aria-label="Bezig met uploaden" /> : null}
              {f.state === "klaar" ? <CheckCircle2 className="size-4 text-brand-600" aria-label="Geüpload" /> : null}
              {f.state === "fout" ? <AlertCircle className="size-4 text-danger-600" aria-hidden /> : null}
              {f.state !== "klaar" && f.state !== "bezig" ? (
                <button type="button" onClick={() => setFiles((l) => l.filter((x) => x.id !== f.id))} className="rounded p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={`Verwijder ${f.file.name}`}>
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {files.length < OFFERTECHECK_MAX_FILES ? (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              add(e.dataTransfer.files);
            }}
            className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-700 hover:border-brand-600 hover:bg-brand-50 focus-within:outline-2 focus-within:outline-brand-600"
          >
            <Upload className="size-5 text-ink-500" aria-hidden />
            <span className="font-medium">{files.length ? "Nog een offerte toevoegen" : "Kies je offertes"}</span>
            <span className="text-xs text-ink-500">of sleep ze hierheen</span>
            <input
              ref={inputRef}
              type="file"
              name="bestanden"
              aria-label="Offertes kiezen"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              className="sr-only"
              onChange={(e) => add(e.target.files)}
            />
          </label>
        ) : null}
        {err("files")?.length ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger-700">
            {err("files")!.join(" ")}
          </p>
        ) : null}
      </div>

      <Field label="Korte projectomschrijving" htmlFor="oc-omschrijving" hint="Type woning, plaats en wat er moet gebeuren." error={err("projectomschrijving")}>
        <Textarea id="oc-omschrijving" name="projectomschrijving" rows={3} disabled={locked} placeholder="Bijv. tussenwoning uit 1965 in Amersfoort: nieuwe badkamer, stucwerk en schilderwerk, elektra deels vervangen." />
      </Field>
      <Field label="Provincie van het project" htmlFor="oc-provincie" error={err("provincie")}>
        <Select id="oc-provincie" name="provincie" defaultValue="" disabled={locked}>
          <option value="">Kies…</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" htmlFor="oc-naam" required error={err("naam")}>
          <Input id="oc-naam" name="naam" autoComplete="name" disabled={locked} />
        </Field>
        <Field label="E-mailadres" htmlFor="oc-email" required hint="Hier sturen we je rapport naartoe." error={err("email")}>
          <Input id="oc-email" name="email" type="email" autoComplete="email" disabled={locked} />
        </Field>
        <Field label="Telefoon" htmlFor="oc-telefoon" error={err("telefoon")}>
          <Input id="oc-telefoon" name="telefoon" type="tel" autoComplete="tel" disabled={locked} />
        </Field>
      </div>
      {/* honeypot: onzichtbaar voor mensen */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <Checkbox name="consent_contact" disabled={locked} label="Ik geef BouwCheck toestemming om contact met mij op te nemen over deze check." />
          {err("consent_contact") ? <p role="alert" className="mt-1 text-xs font-medium text-danger-700">{err("consent_contact")![0]}</p> : null}
        </div>
        <Checkbox
          name="consent_benchmark"
          disabled={locked}
          label="Mijn prijzen mogen zonder namen worden gebruikt om prijzen te vergelijken (optioneel)."
          description="We bewaren dan alleen de prijs per eenheid, het soort werk, de provincie en de maand. Nooit namen, adressen of aannemers."
        />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Bezig…
            </>
          ) : (
            "Offertes laten checken"
          )}
        </Button>
      </div>
    </form>
  );
}
