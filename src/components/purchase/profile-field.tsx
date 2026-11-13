"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { CabinetProfile } from "@/lib/db/queries/account";

/**
 * „ვისთვის ყიდულობ?" — მხოლოდ შესული მომხმარებლისთვის (§20, M5).
 * სტუმარზე `profiles` ცარიელია და კომპონენტი **არაფერს ხატავს**, ანუ
 * ყიდვის ფორმა ზუსტად ისე რჩება, როგორც აქამდე იყო.
 *
 * ⚠ ორი გამოსწორება (2026-08-18, მფლობელის შენიშვნა):
 *  1. ველები **mount-ზევე** ივსება — ადრე შევსება მხოლოდ `onChange`-ში იყო,
 *     ხოლო საწყისი (default-ად არჩეული) პროფილი მოვლენას არ იწვევს, ამიტომ
 *     ველები ცარიელი რჩებოდა მანამ, სანამ სხვა პროფილზე გადახვიდოდი და
 *     უკან დაბრუნდებოდი.
 *  2. ჩამოსაშლელის ნაცვლად **მოსანიშნი ღილაკები** — არჩევანი ერთი შეხედვით
 *     ჩანს და ცხადია, რომ პროფილის შეცვლა შეიძლება.
 *
 * სერვერზე მნიშვნელობა თავიდან მოწმდება (`resolveProfileId`) — hidden ველს
 * იქ არავინ ენდობა, ე.ი. UI-ის ცვლილება უსაფრთხოებას არ ასუსტებს.
 */

const NEW_VALUE = "new";

export function ProfileField({ profiles }: { profiles: CabinetProfile[] }) {
  const groupId = useId();
  const [value, setValue] = useState(
    () => profiles.find((p) => p.isSelf)?.id ?? profiles[0]?.id ?? "",
  );
  const rootRef = useRef<HTMLDivElement>(null);

  /* ველების შევსება — mount-ზეც და არჩევანის ცვლილებაზეც */
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const profile = profiles.find((p) => p.id === value);
    const setField = (name: string, fieldValue: string | null | undefined) => {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLInputElement) {
        element.value = fieldValue ?? "";
      }
    };

    if (profile) {
      setField("name", profile.fullName);
      setField("phone", profile.phone);
      setField("email", profile.email);
    } else {
      /* „სხვა ადამიანი" — ველები იცლება, რომ ხელით შეივსოს */
      setField("name", "");
      setField("phone", "");
      setField("email", "");
    }
  }, [value, profiles]);

  if (profiles.length === 0) return null;

  const options = [
    ...profiles.map((profile) => ({
      id: profile.id,
      label: profile.fullName,
      hint: profile.isSelf ? "მე" : null,
    })),
    { id: NEW_VALUE, label: "სხვა ადამიანი", hint: null },
  ];

  return (
    <div ref={rootRef} className="rounded-card border border-line bg-cream p-4">
      <p className="text-sm font-semibold text-ink">ვისთვის ყიდულობ?</p>

      <div className="mt-3 flex flex-col gap-2">
        {options.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-card border bg-white px-4 py-2.5 transition-colors",
                checked
                  ? "border-green-dark bg-green-light/20"
                  : "border-line hover:bg-cream",
              )}
            >
              <input
                type="radio"
                name="profileId"
                value={option.id}
                checked={checked}
                onChange={() => setValue(option.id)}
                className="size-4 shrink-0 accent-green-dark"
              />
              <span className="text-base text-ink">
                {option.label}
                {option.hint ? (
                  <span className="ml-1 text-sm text-ink-muted">
                    ({option.hint})
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-ink-muted" id={`${groupId}-hint`}>
        ყიდვა შენს ანგარიშს მიება და კაბინეტში გამოჩნდება. „სხვა ადამიანის“
        არჩევისას ქვემოთ შეყვანილი მონაცემებით ახალი პროფილი შეიქმნება.
      </p>
    </div>
  );
}
