import { Notice, PageHeader } from "@/components/ui/misc";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader title={title} eyebrow="Conceptversie" />
      <Notice tone="warning" className="mt-6" title="Concepttekst — niet juridisch gecontroleerd">
        Deze tekst is een concept. Een jurist moet hem nog nakijken. Er kunnen geen rechten aan worden ontleend.
      </Notice>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink-950 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
