"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getPricingSettings,
  memberClubIdsForPhone,
} from "@/lib/db/queries/availability";
import { courses } from "@/lib/db/schema";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  courseDiscountForClubs,
  coursePaymentPlans,
  discountedCoursePriceTetri,
} from "@/lib/pricing";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import type { PriceCheckResult } from "./types";

/**
 * „შეამოწმე შენი ფასი“ — ყიდვამდე, ტელეფონის ნომრით: წევრის კლუბები →
 * კურსის club_discounts-იდან **მაქსიმალური** დამთხვეული განაკვეთი →
 * პერსონალური ფასი (მთელ ლარამდე, floor).
 * purchaseCourse ზუსტად იმავე ფუნქციებით ითვლის — დაპირებული === გადასახდელი.
 * აბრუნებს მხოლოდ რაოდენობას/ფასს — კლუბის სახელს არასდროს (enumeration:
 * სხვისი ნომრით არ უნდა გაიგო, რომელ კლუბშია ვინმე).
 */

const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა.";

const checkSchema = z.object({
  courseId: z.uuid(),
  phone: z.string().trim().min(5).max(40),
});

export async function checkCoursePrice(
  courseId: string,
  phone: string,
): Promise<PriceCheckResult> {
  const parsed = checkSchema.safeParse({ courseId, phone });
  if (!parsed.success) {
    return { status: "error", message: "მიუთითე სწორი ნომერი." };
  }

  /* ორმაგი ლიმიტი: IP-ზე + ნომერზე (ნომრების გადარჩევის შესარბილებლად) */
  const digits = normalizePhoneDigits(parsed.data.phone);
  if (!checkRateLimit(`course-price-check:${await clientIp()}`, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }
  if (!checkRateLimit(`course-price-phone:${digits}`, { limit: 5 })) {
    return { status: "error", message: TOO_MANY };
  }

  try {
    const [course] = await db
      .select({
        priceRegular: courses.priceRegular,
        salePrice: courses.salePrice,
        /* განვადების სვეტები აუცილებელია: თორემ ერთიანი ფასი წევრის
           განაკვეთით ჩამოვა, თვიური კი სტანდარტულად დარჩება */
        monthlyPrice: courses.monthlyPrice,
        monthlyMonths: courses.monthlyMonths,
        clubDiscounts: courses.clubDiscounts,
      })
      .from(courses)
      .where(
        and(eq(courses.id, parsed.data.courseId), eq(courses.isActive, true)),
      )
      .limit(1);

    if (!course) {
      return { status: "error", message: "კურსი ვერ მოიძებნა - განაახლე გვერდი." };
    }

    const settings = await getPricingSettings();
    const memberClubIds = await memberClubIdsForPhone(
      parsed.data.phone,
      settings,
    );
    const discountPercent = courseDiscountForClubs(
      memberClubIds,
      course.clubDiscounts,
    );
    const standardTetri = course.salePrice ?? course.priceRegular;
    const amountTetri = discountedCoursePriceTetri(
      standardTetri,
      discountPercent,
    );

    return {
      status: "ok",
      clubCount: memberClubIds.length,
      discountPercent,
      amountTetri,
      standardTetri,
      /* purchaseCourse იმავე ფუნქციით ითვლის — დაპირებული === გადასახდელი */
      plans: coursePaymentPlans(course, discountPercent),
    };
  } catch (error) {
    console.error("[course-price-check] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}
