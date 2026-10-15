"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";

export type PickedPhoto = { id: string; file: File; url: string };

const MAX_EDGE = 1568; // ruim voldoende detail voor beeldanalyse, klein genoeg voor upload
const QUALITY = 0.82;

/** Verkleint een foto in de browser tot JPEG, zodat uploads klein blijven (Vercel: max. ~4,5 MB per request). */
async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Comprimeren mislukt");
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export function PhotoPicker({ photos, onChange, max, error }: { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void; max: number; error?: string[] }) {
  const [busy, setBusy] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setLocalError(null);
    const room = max - photos.length;
    const files = [...list].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (list.length > room) setLocalError(`Maximaal ${max} foto's; de overige zijn niet toegevoegd.`);
    setBusy(true);
    const added: PickedPhoto[] = [];
    for (const f of files) {
      try {
        const c = await compress(f);
        added.push({ id: crypto.randomUUID(), file: c, url: URL.createObjectURL(c) });
      } catch {
        setLocalError(`${f.name} kon niet worden gelezen (gebruik JPG, PNG of WebP).`);
      }
    }
    setBusy(false);
    onChange([...photos, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const errors = localError ? [localError] : error;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative size-24 overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Foto ${p.file.name}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(p.url);
                onChange(photos.filter((x) => x.id !== p.id));
              }}
              className="absolute right-1 top-1 rounded-full bg-ink-950/70 p-1 text-white hover:bg-ink-950"
              aria-label={`Verwijder ${p.file.name}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {photos.length < max ? (
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 text-xs text-ink-600 hover:border-brand-600 hover:bg-brand-50 focus-within:outline-2 focus-within:outline-brand-600">
            <ImagePlus className="size-5" aria-hidden />
            {busy ? "Verwerken…" : "Foto's toevoegen"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => add(e.target.files)}
              aria-label="Foto's toevoegen"
            />
          </label>
        ) : null}
      </div>
      <p className="text-xs text-ink-500">
        Optioneel, max. {max}. Bijvoorbeeld badkamer, keuken, meterkast, gevel, dak of zichtbare gebreken. Foto&apos;s worden verkleind voordat ze worden verstuurd.
      </p>
      {errors?.length ? (
        <p role="alert" className="text-xs font-medium text-danger-700">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
