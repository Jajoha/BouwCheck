import { randomUUID } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { env } from "@/lib/env";
import { verifyConcept } from "@/lib/data/offertecheck";
import { OFFERTECHECK_MAX_BYTES, OFFERTECHECK_MAX_FILES, OFFERTECHECK_TYPES } from "@/lib/domain/offertecheck";

/**
 * Geeft de browser een kortlevend token om één offerte rechtstreeks naar Vercel Blob (privé) te uploaden.
 * Zo gaan bestanden tot 15 MB niet door de serverfunctie (Vercel: max. ~4,5 MB per request).
 * Na de upload registreert de browser het bestand via registerBlobFileAction, die type, grootte en signatuur controleert.
 */
export async function POST(request: Request): Promise<Response> {
  if (!env.features.offertecheck || !env.blobConfigured) return new Response("Niet beschikbaar", { status: 404 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { checkId, secret } = JSON.parse(clientPayload ?? "{}") as { checkId?: string; secret?: string };
        if (!checkId || !secret || !new RegExp(`^offertechecks/${checkId}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`).test(pathname)) throw new Error("Ongeldig pad");
        const concept = await verifyConcept(checkId, secret);
        if (!concept) throw new Error("Check verlopen");
        if (concept.fileCount >= OFFERTECHECK_MAX_FILES) throw new Error("Maximaal 5 bestanden");
        return {
          allowedContentTypes: [...OFFERTECHECK_TYPES],
          maximumSizeInBytes: OFFERTECHECK_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60_000,
          tokenPayload: JSON.stringify({ checkId, nonce: randomUUID() }),
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload geweigerd" }, { status: 400 });
  }
}
