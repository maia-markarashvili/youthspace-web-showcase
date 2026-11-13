"use server";

import { z } from "zod";
import { createLead, upsertSubscriber } from "@/lib/db/queries/leads";
import type { FormState } from "@/lib/form-state";
import { notify } from "@/lib/n8n";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

/**
 * საჯარო ფორმების Server Actions.
 *
 * ⚠ Server Functions პირდაპირი POST-ითაც მისაწვდომია — ამიტომ ვალიდაცია და
 * rate-limit ყოველთვის **აქ, სერვერზე** ხდება, არა მხოლოდ UI-ში.
 * ⚠ ამ ფაილიდან მხოლოდ async ფუნქციები უნდა იყოს ექსპორტებული —
 * FormState/initialFormState ცხოვრობს src/lib/form-state.ts-ში.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა ან მოგვწერეთ.";

/* ── კონტაქტი (§5.8 → leads type='contact') ───────────────────── */

const contactSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  email: z.email(INVALID_EMAIL),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5, "დაწერეთ მოკლე შეტყობინება").max(4000),
});

export async function submitContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("company_website")) return { status: "success" };

  if (!checkRateLimit(await clientKey("contact"), { limit: 5 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const lead = await createLead({
      type: "contact",
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
    });

    await notify("contact", {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      ref_id: lead?.id,
    });
  } catch (error) {
    console.error("[contact] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }

  return {
    status: "success",
    message: "მადლობა! შეტყობინება მივიღეთ და მალე დაგიკავშირდებით.",
  };
}

/* ── კურსის პარტნიორობა (§5.6 → leads type='b2b_partner') ─────── */

const partnerSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.email(INVALID_EMAIL),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  topic: z.string().trim().min(2, REQUIRED).max(200),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function submitPartner(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("company_website")) return { status: "success" };

  if (!checkRateLimit(await clientKey("partner"), { limit: 5 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = partnerSchema.safeParse({
    name: formData.get("name"),
    organization: formData.get("organization"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    topic: formData.get("topic"),
    experience: formData.get("experience"),
    terms: formData.get("terms"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const lead = await createLead({
      type: "b2b_partner",
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      payload: {
        organization: parsed.data.organization || null,
        topic: parsed.data.topic,
        experience: parsed.data.experience || null,
        preferred_terms: parsed.data.terms || null,
      },
    });

    await notify("b2b_partner", {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      item_title: parsed.data.topic,
      ref_id: lead?.id,
    });
  } catch (error) {
    console.error("[partner] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }

  return {
    status: "success",
    message:
      "განაცხადი მიღებულია. კურსის პირობებზე შესათანხმებლად მალე დაგიკავშირდებით.",
  };
}

/* ── რეგისტრაცია (leads type='registration') ──────────────────────
   სადაც ონლაინ გადახდა არ დგას (ან თავისუფალი დრო არ არის), რეგისტრაცია =
   განაცხადი: ინახება leads-ში და ორგანიზაცია თავად უკავშირდება. */

const REGISTRATION_ITEM_TYPES = [
  "club",
  "course",
  "membership",
  "dropin",
  "space",
] as const;

const registrationSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  itemType: z.enum(REGISTRATION_ITEM_TYPES),
  itemSlug: z.string().trim().max(120).optional().or(z.literal("")),
  itemTitle: z.string().trim().min(1).max(200),
});

export async function submitRegistration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("company_website")) return { status: "success" };

  if (!checkRateLimit(await clientKey("registration"), { limit: 5 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    message: formData.get("message"),
    itemType: formData.get("itemType"),
    itemSlug: formData.get("itemSlug"),
    itemTitle: formData.get("itemTitle"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const lead = await createLead({
      type: "registration",
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      message: parsed.data.message || null,
      payload: {
        item_type: parsed.data.itemType,
        item_slug: parsed.data.itemSlug || null,
        item_title: parsed.data.itemTitle,
      },
    });

    await notify("registration", {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone,
      item_title: parsed.data.itemTitle,
      ref_id: lead?.id,
    });
  } catch (error) {
    console.error("[registration] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }

  return {
    status: "success",
    message:
      "განაცხადი მიღებულია! მალე დაგიკავშირდებით დეტალების შესათანხმებლად.",
  };
}

/* ── ნიუსლეთერი (§5.10 → subscribers) ─────────────────────────── */

const newsletterSchema = z.object({
  email: z.email(INVALID_EMAIL),
  source: z.string().trim().max(60).optional(),
});

export async function subscribeNewsletter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("company_website")) return { status: "success" };

  if (!checkRateLimit(await clientKey("newsletter"), { limit: 3 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: INVALID_EMAIL,
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const subscriber = await upsertSubscriber(
      parsed.data.email,
      parsed.data.source || "site",
    );
    await notify("newsletter", {
      email: parsed.data.email,
      ref_id: subscriber?.id,
    });
  } catch (error) {
    console.error("[newsletter] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success", message: "გამოწერილია - მადლობა!" };
}
