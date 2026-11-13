import type { OtpChallenge } from "@/lib/otp";
import type { CoursePaymentPlans } from "@/lib/pricing";

/**
 * კურსის ყიდვის ფორმის state — ცალკე ფაილში, რადგან "use server" მოდულს
 * მხოლოდ async ფუნქციების ექსპორტი შეუძლია (იხ. src/lib/form-state.ts-ის
 * ანალოგიური განმარტება).
 */

export type CoursePurchaseOrder = {
  /** CRS-##### — შეკვეთის იდენტიფიკატორი (კაბინეტი /account, desk) */
  orderRef: string;
  /** გადასახდელი თანხა თეთრში (კლუბის ფასდაკლების შემდეგ) */
  amountTetri: number;
  /** საწყისი ფასი თეთრში (sale ან standard) — ფასდაკლებამდე */
  standardTetri: number;
  /** კლუბის წევრობით მიღებული ფასდაკლება% (0 = ფასდაკლება არ არის) */
  discountPercent: number;
  /** განვადებით ყიდვისას — სულ რამდენი თვეა; null = ერთიანად გადახდილი.
   *  amountTetri ასეთ დროს **პირველი თვეა**, არა გეგმის ჯამი */
  planMonths: number | null;
  /** გეგმის ჯამი თეთრში — მხოლოდ საჩვენებლად (Flitt-ს არ გადაეცემა) */
  planTotalTetri: number | null;
  /** კურსის სათაური წარმატების ეკრანისთვის */
  title: string;
  /** გადარიცხვის რეკვიზიტები pricing_settings-იდან (null → ჯერ არ არის) */
  bankRequisites: string | null;
  /** ბარათით გადახდისას — Flitt-ის გვერდის მისამართი */
  redirectUrl?: string | null;
};

export type CoursePurchaseState = {
  status: "idle" | "success" | "error" | "otp";
  message?: string;
  errors?: Record<string, string>;
  /** გადმორიცხვისას, უცნობი ნომრისთვის — status:"otp"-ზე ივსება (§4) */
  otp?: OtpChallenge;
  order?: CoursePurchaseOrder;
};

export const initialCoursePurchaseState: CoursePurchaseState = {
  status: "idle",
};

/** „შეამოწმე შენი ფასი“ — checkCoursePrice-ის პასუხი (price-actions.ts) */
export type PriceCheckResult =
  | {
      status: "ok";
      /** აქტიური კლუბების რაოდენობა ამ ნომერზე (0 = წევრი ვერ მოიძებნა) */
      clubCount: number;
      discountPercent: number;
      /** პერსონალური ფასი თეთრში — მთელ ლარამდე დამრგვალებული (ერთიანი) */
      amountTetri: number;
      standardTetri: number;
      /** ორივე ვარიანტი ამ ფასდაკლებით — რადიოები და ჯამის ხაზი აქედან იხატება */
      plans: CoursePaymentPlans;
    }
  | { status: "error"; message: string };
