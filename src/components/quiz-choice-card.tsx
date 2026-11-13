"use client";

import { trackQuizChoice, type QuizChoice } from "@/components/meta-pixel";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * ქვიზის შედეგის ერთი გზა (ღია კარი / ყიდვა / კლუბები): სათაური, ტექსტი,
 * ფაქტების ხაზი, ღილაკი. client-კომპონენტია მხოლოდ დაწკაპუნების
 * pixel-ივენთის გამო - მონაცემები სერვერიდან მზა სტრიქონებად მოდის.
 */
export function QuizChoiceCard({
  choice,
  club,
  href,
  title,
  text,
  facts,
  cta,
  badge,
  highlighted = false,
  primary = false,
}: {
  choice: QuizChoice;
  /** რეკომენდებული კლუბის slug - pixel content_name */
  club: string;
  href: string;
  title: string;
  text: string;
  /** „19 სექტემბერი · შაბათს, 15:00 · დარჩა 7 ადგილი" - არასავალდებულო */
  facts?: string;
  cta: string;
  /** გამოყოფილი ბარათის ბეჯი („რეკომენდებული") */
  badge?: string;
  highlighted?: boolean;
  /** primary ღილაკი (გამოყოფილსა და ყიდვაზე); სხვაზე secondary */
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border p-5 shadow-card",
        highlighted ? "border-green-dark bg-cream" : "border-line bg-white",
      )}
    >
      {badge ? (
        <span className="self-start rounded-pill bg-green-dark px-3 py-1 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
      <h3 className="text-h3 font-bold text-green-dark">{title}</h3>
      <p className="text-sm leading-7 text-ink-muted">{text}</p>
      {facts ? <p className="text-sm font-semibold text-ink">{facts}</p> : null}
      <div className="mt-auto pt-2">
        <ButtonLink
          href={href}
          variant={primary ? "primary" : "secondary"}
          onClick={() => trackQuizChoice(choice, club)}
        >
          {cta}
        </ButtonLink>
      </div>
    </div>
  );
}
