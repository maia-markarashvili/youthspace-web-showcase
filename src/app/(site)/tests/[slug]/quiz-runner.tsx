"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { trackContactLead } from "@/components/meta-pixel";
import type { Quiz } from "@/lib/quizzes";

/**
 * ტესტის ინტერაქტიული ნაწილი — ერთი კითხვა ეკრანზე, პროგრეს-ზოლი, უკან/თავიდან.
 * შედეგის პანელი (მატჩი + სამი გზა) სერვერიდან მზა ReactNode-ებად მოდის — ქულებში
 * მხოლოდ ის კლუბები ითვლება, რომლებიც რეალურად არსებობს და აქტიურია.
 *
 * შედეგი URL-შიც ინახება (`?r=<slug>`): ბარათიდან წასული და „უკან" დაბრუნებული
 * ისევ არჩევანს ხედავს და არა პირველ კითხვას.
 */

type Labels = {
  progress: string;
  back: string;
  resultEyebrow: string;
  resultTitle: string;
  retake: string;
  fallback: string;
  allClubs: string;
};

type Props = {
  quiz: Quiz;
  resultCards: Record<string, ReactNode>;
  clubTitles: Record<string, string>;
  labels: Labels;
};

const RESULT_PARAM = "r";

/** საკუთარი გასაღები და არა პროტოტიპისა (`in`-ის ხაფანგი: "__proto__", "constructor") */
function hasCard(cards: Record<string, ReactNode>, slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(cards, slug);
}

/** ?r= სინქრონი History API-ით: Next-ი useSearchParams-ს თავად ანახლებს,
 *  router.replace-ისგან განსხვავებით კი force-dynamic გვერდის სერვერულ
 *  ხელახალ რენდერს (RSC round-trip) არ იწვევს */
function replaceUrl(url: string) {
  window.history.replaceState(null, "", url);
}

/* useSearchParams Suspense-საზღვარს ითხოვს — გარსი მხოლოდ ამისთვისაა */
export function QuizRunner(props: Props) {
  return (
    <Suspense fallback={null}>
      <QuizRunnerInner {...props} />
    </Suspense>
  );
}

function QuizRunnerInner({ quiz, resultCards, clubTitles, labels }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ?r= მხოლოდ არსებულ/აქტიურ კლუბზე ითვლება — უცხო slug-ით ქვიზი თავიდან იწყება.
     ⚠ hasOwnProperty და არა `in`: `?r=__proto__` პროტოტიპის გასაღებს იპოვიდა
     და Object.prototype-ს ReactNode-ად დაარენდერებდა (გვერდის crash) */
  const presetParam = searchParams.get(RESULT_PARAM);
  const [preset, setPreset] = useState<string | null>(() =>
    presetParam && hasCard(resultCards, presetParam) ? presetParam : null,
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const total = quiz.questions.length;
  const finished = preset !== null || step >= total;

  function choose(optionIndex: number) {
    setAnswers((prev) => {
      const next = prev.slice(0, step);
      next[step] = optionIndex;
      return next;
    });
    setStep((prev) => prev + 1);
  }

  function back() {
    setStep((prev) => Math.max(0, prev - 1));
  }

  function retake() {
    setPreset(null);
    setAnswers([]);
    setStep(0);
    replaceUrl(pathname);
  }

  /* ── შედეგი ── */
  if (finished) {
    let winner: string | null = preset;

    if (winner === null) {
      const scores = new Map<string, number>();
      answers.forEach((optionIndex, questionIndex) => {
        const option = quiz.questions[questionIndex]?.options[optionIndex];
        if (!option) return;
        for (const [slug, points] of Object.entries(option.scores)) {
          /* მხოლოდ არსებული/აქტიური კლუბები — წაშლილი slug არ უნდა მოიგოს */
          if (!hasCard(resultCards, slug)) continue;
          scores.set(slug, (scores.get(slug) ?? 0) + points);
        }
      });

      let best = -1;
      /* clubOrder-ის თანმიმდევრობა = ტოლობის დროს პირველი იმარჯვებს */
      for (const slug of quiz.clubOrder) {
        const score = scores.get(slug);
        if (score !== undefined && score > best) {
          best = score;
          winner = slug;
        }
      }
    }

    return (
      <div className="mt-10">
        <p className="eyebrow">{labels.resultEyebrow}</p>

        {winner ? (
          <>
            <QuizResultEffects winner={winner} fromUrl={preset !== null} />
            <h2 className="mt-2 text-h2 font-bold text-green-dark">
              {labels.resultTitle} {clubTitles[winner]}
            </h2>
            <div className="mt-6">{resultCards[winner]}</div>
            <div className="mt-8">
              <Button type="button" variant="ghost" onClick={retake}>
                {labels.retake}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-lead leading-8 text-ink">
              {labels.fallback}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/clubs">{labels.allClubs}</ButtonLink>
              <Button type="button" variant="ghost" onClick={retake}>
                {labels.retake}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── კითხვა ── */
  const question = quiz.questions[step];
  const progressLabel = labels.progress
    .replace("{n}", String(step + 1))
    .replace("{total}", String(total));

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-ink-muted">{progressLabel}</p>
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-white"
          >
            {labels.back}
          </button>
        ) : null}
      </div>

      {/* პროგრეს-ზოლი */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label={progressLabel}
        className="mt-3 h-1.5 overflow-hidden rounded-pill bg-line"
      >
        <div
          className="h-full rounded-pill bg-green-dark transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <h2 className="mt-8 text-h2 font-bold text-ink">{question.title}</h2>

      <div className="mt-6 flex flex-col gap-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => choose(index)}
            className={cn(
              "min-h-11 rounded-card border bg-white p-4 text-left text-base leading-7 text-ink transition",
              answers[step] === index
                ? "border-green-dark bg-cream"
                : "border-line hover:border-green-mid",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * შედეგის გვერდითი ეფექტები: (1) `?r=<slug>` სინქრონი, რომ „უკან" შედეგზე
 * აბრუნებდეს; (2) Meta Pixel Lead — content_name = რეკომენდებული კლუბის slug.
 * URL-იდან (fromUrl) გახსნისას Lead **არ** ისვრის: ის რეალურ დასრულებაზე ერთხელ
 * უკვე გავიდა. ხელახლა გავლისას (retake) კომპონენტი remount-დება და ახალი
 * შედეგი ისვრის.
 */
function QuizResultEffects({
  winner,
  fromUrl,
}: {
  winner: string;
  fromUrl: boolean;
}) {
  const fired = useRef(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get(RESULT_PARAM) !== winner) {
      replaceUrl(`${pathname}?${RESULT_PARAM}=${winner}`);
    }
    if (fromUrl || fired.current) return;
    fired.current = true;
    trackContactLead({ category: "quiz", name: winner });
  }, [winner, fromUrl, pathname, searchParams]);

  return null;
}
