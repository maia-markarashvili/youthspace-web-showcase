import type { LandingFact } from "@/lib/landing";

/**
 * კომპაქტური სპეც-სია ლენდინგის ჰეროში (azraki-ს სტილი): თხელი ხაზები
 * label:value წყვილებით — დიდი „ფაქტების კუბების" სექციის ჩამნაცვლებელი,
 * რომ გვერდი არ იზრდებოდეს.
 */
export function SpecList({ facts }: { facts: LandingFact[] }) {
  if (facts.length === 0) return null;

  return (
    <dl className="mt-4 border-y border-line">
      {facts.map((fact) => (
        <div
          key={fact.title}
          className="flex items-baseline gap-4 border-b border-line py-2 last:border-b-0"
        >
          <dt className="w-24 shrink-0 text-xs font-semibold tracking-widest text-green-mid uppercase">
            {fact.title}
          </dt>
          <dd className="text-sm leading-6 text-ink">{fact.text}</dd>
        </div>
      ))}
    </dl>
  );
}
