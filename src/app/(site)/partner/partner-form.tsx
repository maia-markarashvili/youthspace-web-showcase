"use client";

import { useActionState } from "react";
import { submitPartner } from "@/app/actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  Honeypot,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";

export function PartnerForm() {
  const [state, action, pending] = useActionState(
    submitPartner,
    initialFormState,
  );

  if (state.status === "success") {
    return <FormMessage status="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="სახელი და გვარი"
          name="name"
          required
          autoComplete="name"
          error={state.errors?.name}
        />
        <TextField
          label="ორგანიზაცია"
          name="organization"
          hint="არასავალდებულო"
          error={state.errors?.organization}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ელფოსტა"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={state.errors?.email}
        />
        <TextField
          label="ტელეფონი"
          name="phone"
          type="tel"
          autoComplete="tel"
          hint="არასავალდებულო"
          error={state.errors?.phone}
        />
      </div>

      <TextField
        label="კურსის თემა"
        name="topic"
        required
        placeholder="მაგ. გრაფიკული დიზაინის საფუძვლები"
        error={state.errors?.topic}
      />
      <TextAreaField
        label="გამოცდილება"
        name="experience"
        hint="რამდენ ხანს ასწავლი ან მუშაობ ამ სფეროში"
        error={state.errors?.experience}
      />
      <TextAreaField
        label="სასურველი პირობა"
        name="terms"
        hint="მაგ. შემოსავლის გაყოფის მოდელი, ჯგუფის ზომა, განრიგი"
        error={state.errors?.terms}
      />
      <TextAreaField
        label="დამატებითი შეტყობინება"
        name="message"
        error={state.errors?.message}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-fit">
        {pending ? "იგზავნება…" : "განაცხადის გაგზავნა"}
      </Button>
    </form>
  );
}
