"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FormMessage, TextField } from "@/components/ui/form-field";
import type { CabinetProfile } from "@/lib/db/queries/account";
import { initialFormState } from "@/lib/form-state";
import { deleteProfile, saveProfile } from "./actions";

/**
 * პროფილების მართვა — მშობელი ამატებს შვილ(ებ)ს, რომ ყიდვისას „ვისთვის"
 * აირჩიოს (M5). self-პროფილი რეგისტრაციისას იქმნება და არ იშლება.
 */

function ProfileForm({
  profile,
  onDone,
}: {
  profile?: CabinetProfile;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveProfile, initialFormState);

  /* წარმატებული შენახვის შემდეგ ფორმა იკეცება (revalidatePath-ს სია უკვე
     განახლებული მოაქვს) — render-ის დროს setState React-ს ეკრძალება */
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      {profile ? (
        <input type="hidden" name="profileId" value={profile.id} />
      ) : null}
      <TextField
        label="სახელი და გვარი"
        name="fullName"
        required
        defaultValue={profile?.fullName ?? ""}
        error={state.errors?.fullName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ტელეფონი"
          name="phone"
          type="tel"
          placeholder="5XX XX XX XX"
          defaultValue={profile?.phone ?? ""}
          error={state.errors?.phone}
        />
        <TextField
          label="ელფოსტა"
          name="email"
          type="email"
          defaultValue={profile?.email ?? ""}
          error={state.errors?.email}
        />
      </div>
      <TextField
        label="დაბადების თარიღი"
        name="birthDate"
        type="date"
        hint="არასავალდებულო - ასაკობრივი ჯგუფისთვის"
        error={state.errors?.birthDate}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "ინახება…" : "შენახვა"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          გაუქმება
        </Button>
      </div>
    </form>
  );
}

function DeleteForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(
    deleteProfile,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="profileId" value={profileId} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "იშლება…" : "წაშლა"}
      </Button>
      {state.status === "error" && state.message ? (
        <span className="text-xs text-ink-muted">{state.message}</span>
      ) : null}
    </form>
  );
}

export function ProfilesManager({ profiles }: { profiles: CabinetProfile[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h3 font-bold text-green-dark">
            პროფილები
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            დაამატე შვილ(ებ)ის პროფილი - ყიდვისას აირჩევ, ვისთვის არის.
          </p>
        </div>
        {!adding ? (
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            + პროფილის დამატება
          </Button>
        ) : null}
      </div>

      {adding ? <ProfileForm onDone={() => setAdding(false)} /> : null}

      <ul className="mt-4 flex flex-col">
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className="border-b border-line py-3 last:border-0"
          >
            {editingId === profile.id ? (
              <ProfileForm
                profile={profile}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{profile.fullName}</p>
                    {profile.isSelf ? (
                      <Badge tone="accent">მე</Badge>
                    ) : (
                      <Badge tone="outline">ბავშვი</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {[profile.phone, profile.email].filter(Boolean).join(" · ") ||
                      "კონტაქტი არ არის მითითებული"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(profile.id)}
                  >
                    რედაქტირება
                  </Button>
                  {!profile.isSelf ? (
                    <DeleteForm profileId={profile.id} />
                  ) : null}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
