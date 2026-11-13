"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  adminUsers,
  clubs,
  contentPosts,
  courses,
  subscribers,
} from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { mailConfigured, sendMail } from "@/lib/mail";
import { renderEmailHtml } from "@/lib/mail-template";
import { markdownExcerpt } from "@/lib/markdown";
import { unsubscribeUrl } from "@/lib/newsletter-token";
import { siteConfig } from "@/lib/site-config";

/**
 * გამომწერებზე სიახლის დაგზავნა — Resend HTTP API-ით, იმავე არხით, რითაც
 * საიტის ყველა სხვა წერილი მიდის (lib/mail.ts).
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სხვა ექსპორტი ფორმებს ამტვრევს.
 *
 * ⚠ ისტორია (2026-09-10): აქამდე ეს ერთადერთი წერტილი იყო, რომელიც n8n-ის
 * webhook-ს ეყრდნობოდა (PRD ფაზა 4). n8n არასდროს დაკავშირებულა, ამიტომ
 * ღილაკი ყოველთვის შეცდომას აბრუნებდა და არც ერთი წერილი არ გადიოდა.
 * ტრანზაქციული ფოსტა კი 2026-08-19-იდან Resend-ზეა (Railway SMTP-ს ბლოკავს) —
 * დაგზავნაც იმავე, ნამუშევარ არხზე გადავიდა და n8n-ს აღარ ელოდება.
 *
 * თითოეულს **ცალკე** წერილი მიდის (გამომწერები ერთმანეთის მისამართს ვერ
 * ხედავენ) + პერსონალური „გამოწერის გაუქმების" ბმული და List-Unsubscribe
 * ჰედერი (spam-ფილტრებისთვისაც და კანონისთვისაც).
 */

/** Resend-ის ლიმიტი 2 მოთხოვნა/წამში — 2-იანი ჯგუფი + პაუზა ამაზე ქვემოთ ჭრის.
 *  ⚠ ასეულობით გამომწერზე ეს action ნელი გახდება — მაშინ რიგში (queue/batch
 *  endpoint) გატანაა საჭირო და არა ამ ციკლის აჩქარება. */
const CHUNK_SIZE = 2;
const CHUNK_PAUSE_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const inputSchema = z.object({
  itemType: z.enum(["club", "course", "news"]),
  itemId: z.uuid(),
  /** "test" = ერთი საცდელი წერილი, გამომწერებს არ ეხება */
  mode: z.enum(["all", "test"]).catch("all"),
  /** ტესტის ადრესატი; ცარიელი = შესული ადმინის მისამართი.
   *  ⚠ თავისუფალი ტექსტია, მაგრამ სერვერზე მხოლოდ **ცნობილი** მისამართები
   *  გაივლის (admin_users ან აქტიური გამომწერი) — თორემ ღილაკი ნებისმიერ
   *  მისამართზე გაგზავნის საშუალებას მისცემდა (mail relay). */
  testEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .catch(undefined),
});

export async function sendBroadcast(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireOwner();

  const parsed = inputSchema.safeParse({
    itemType: formData.get("itemType"),
    itemId: formData.get("itemId"),
    mode: formData.get("mode"),
    testEmail: formData.get("testEmail") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "არასწორი მოთხოვნა - განაახლე გვერდი და სცადე თავიდან",
    };
  }
  const { itemType, itemId, mode, testEmail } = parsed.data;
  const isTest = mode === "test";
  const testTarget = testEmail || admin.email.toLowerCase();

  /* ცნობილი მისამართების ბადე — ტესტი მხოლოდ ადმინზე ან გამომწერზე მიდის */
  if (isTest) {
    const [known] = await db
      .select({ email: adminUsers.email })
      .from(adminUsers)
      .where(sql`lower(${adminUsers.email}) = ${testTarget}`)
      .limit(1);
    if (!known) {
      const [subscriber] = await db
        .select({ email: subscribers.email })
        .from(subscribers)
        .where(sql`lower(${subscribers.email}) = ${testTarget}`)
        .limit(1);
      if (!subscriber) {
        return {
          status: "error",
          message:
            "ტესტი მხოლოდ ადმინის ან გამომწერის მისამართზე იგზავნება - შეამოწმე ჩაწერილი მისამართი",
        };
      }
    }
  }

  /* ჩანაწერის ჩატვირთვა + საჯარო ბმული/ტექსტი ტიპის მიხედვით */
  const base = siteConfig.url.replace(/\/$/, "");
  let title: string;
  let url: string;
  let excerpt: string;

  /* გამორთულ/გამოუქვეყნებელ გვერდზე ბმულს არ ვგზავნით — გამომწერი 404-ს მიიღებდა */
  const HIDDEN = "ჯერ გამოაქვეყნე - ეს გვერდი საიტზე არ ჩანს (გამორთულია)";

  if (itemType === "club") {
    const [row] = await db.select().from(clubs).where(eq(clubs.id, itemId));
    if (!row) return { status: "error", message: "ჩანაწერი ვერ მოიძებნა" };
    if (!row.isActive) return { status: "error", message: HIDDEN };
    title = row.title;
    url = `${base}/clubs/${row.slug}`;
    excerpt = markdownExcerpt(row.description ?? "", 200);
  } else if (itemType === "course") {
    const [row] = await db.select().from(courses).where(eq(courses.id, itemId));
    if (!row) return { status: "error", message: "ჩანაწერი ვერ მოიძებნა" };
    if (!row.isActive) return { status: "error", message: HIDDEN };
    title = row.title;
    url = `${base}/courses/${row.slug}`;
    excerpt = markdownExcerpt(row.description ?? "", 200);
  } else {
    const [row] = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.id, itemId));
    if (!row) return { status: "error", message: "ჩანაწერი ვერ მოიძებნა" };
    if (!row.isActive) return { status: "error", message: HIDDEN };
    if (row.publishedAt && row.publishedAt > new Date()) {
      return {
        status: "error",
        message: "გამოქვეყნების თარიღი მომავალშია - გვერდი საიტზე ჯერ არ ჩანს",
      };
    }
    if (!row.slug) {
      return {
        status: "error",
        message: "ჯერ მიუთითე slug - გასაზიარებელი ბმული სჭირდება",
      };
    }
    title = row.title;
    url = `${base}/stories/${row.slug}`;
    excerpt = markdownExcerpt(row.body ?? "", 200);
  }

  /* ტესტს ერთი ადრესატი ჰყავს; გაუქმების ბმული მაშინ აქვს, თუ ეს მისამართი
     გამომწერებშიც ზის (სხვისი id-ით ბმულს ვერ გავცემთ) */
  const activeSubscribers = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.isActive, true));

  const recipients = isTest
    ? [
        {
          id:
            activeSubscribers.find(
              (row) => row.email.toLowerCase() === testTarget,
            )?.id ?? null,
          email: testTarget,
        },
      ]
    : activeSubscribers.map((row) => ({ id: row.id as string | null, email: row.email }));

  if (recipients.length === 0) {
    return { status: "error", message: "გამომწერები ჯერ არ არიან" };
  }

  if (!mailConfigured()) {
    /* პატიოსანი პასუხი — წარმატებას არასდროს ვაყალბებთ */
    return {
      status: "error",
      message:
        "ელფოსტის არხი გამორთულია (RESEND_API_KEY არ არის) - გაგზავნა მისი კონფიგურაციის შემდეგ ამუშავდება",
    };
  }

  /* HTML-ში სათაური ცალკე, ბრენდის ფონტით გამოყოფილი ხაზია, ამიტომ ტექსტში
     აღარ მეორდება; უბრალო-ტექსტიან ვერსიას კი სტილი არ აქვს და სათაური
     პირველ ხაზად რჩება */
  const htmlBody = [excerpt, `სრულად: ${url}`]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
  const textBody = [`„${title}“`, htmlBody].join("\n\n");
  const footer = [siteConfig.name, siteConfig.phone, siteConfig.address]
    .filter(Boolean)
    .join(" · ")
    .concat(
      "\nეს წერილი მიიღე, რადგან სივრცის სიახლეები გაქვს გამოწერილი.",
    );

  let sent = 0;
  for (let index = 0; index < recipients.length; index += CHUNK_SIZE) {
    const chunk = recipients.slice(index, index + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (row) => {
        const unsubscribe = row.id ? await unsubscribeUrl(row.id) : null;
        return sendMail({
          to: row.email,
          subject: isTest ? `[ტესტი] ${title}` : title,
          text: unsubscribe
            ? `${textBody}\n\n---\nგამოწერის გაუქმება: ${unsubscribe}`
            : textBody,
          html: renderEmailHtml({
            body: htmlBody,
            heading: title,
            brand: "სივრცის სიახლეები",
            siteUrl: siteConfig.url,
            footer,
            ...(unsubscribe ? { unsubscribeUrl: unsubscribe } : {}),
          }),
          ...(unsubscribe
            ? { headers: { "List-Unsubscribe": `<${unsubscribe}>` } }
            : {}),
        });
      }),
    );
    sent += results.filter(Boolean).length;
    if (index + CHUNK_SIZE < recipients.length) await sleep(CHUNK_PAUSE_MS);
  }

  const failed = recipients.length - sent;
  console.info(
    `[broadcast${isTest ? ":test" : ""}] ${itemType} "${title}" → ${sent}/${recipients.length} გაიგზავნა`,
  );

  if (sent === 0) {
    return {
      status: "error",
      message: isTest
        ? `ტესტი ვერ გაიგზავნა ${testTarget}-ზე - შეამოწმე Resend-ის კონფიგურაცია (ლოგში წერია მიზეზი)`
        : "ვერც ერთი წერილი ვერ გაიგზავნა - შეამოწმე Resend-ის კონფიგურაცია (ლოგში წერია მიზეზი)",
    };
  }
  if (isTest) {
    const note = recipients[0].id
      ? ""
      : " (გაუქმების ბმულის გარეშე - ეს მისამართი გამომწერებში არაა)";
    return {
      status: "success",
      message: `ტესტი გაიგზავნა ${testTarget}-ზე${note} - გამომწერებს არაფერი წასულა`,
    };
  }
  return {
    status: "success",
    message:
      failed === 0
        ? `გაიგზავნა ${sent} გამომწერს`
        : `გაიგზავნა ${sent}/${recipients.length} - ${failed} ვერ გაიგზავნა (ლოგში წერია მიზეზი)`,
  };
}
