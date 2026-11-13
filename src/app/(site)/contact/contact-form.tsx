"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContact } from "@/app/actions";
import { track } from "@/components/meta-pixel";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  Honeypot,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";

export function ContactForm() {
  const [state, action, pending] = useActionState(
    submitContact,
    initialFormState,
  );

  /* Meta Pixel Contact — შეტყობინება გაიგზავნა, ერთხელ */
  const contactFired = useRef(false);
  useEffect(() => {
    if (state.status !== "success" || contactFired.current) return;
    contactFired.current = true;
    track("Contact");
  }, [state.status]);

  if (state.status === "success") {
    return <FormMessage status="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />

      <TextField
        label="სახელი"
        name="name"
        required
        autoComplete="name"
        error={state.errors?.name}
      />
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
      <TextAreaField
        label="შეტყობინება"
        name="message"
        required
        error={state.errors?.message}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-fit">
        {pending ? "იგზავნება…" : "გაგზავნა"}
      </Button>
    </form>
  );
}
