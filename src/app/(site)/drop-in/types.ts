import type { OtpChallenge } from "@/lib/otp";

/**
 * Drop-in ყიდვის ფორმების საერთო ტიპები — ცალკე ფაილში, რადგან "use server"
 * მოდულს (entry-actions.ts) მხოლოდ async ფუნქციების ექსპორტი შეუძლია.
 */

/** წარმატებული ყიდვის/ჯავშნის შედეგი — წარმატების ბარათი ამით ივსება */
export type EntryOrder = {
  /** PSS/CWK-##### — შეკვეთის იდენტიფიკატორი (კაბინეტი /account, desk) */
  orderRef: string;
  /** გადასახდელი თანხა თეთრში; 0 = პასით ჯავშანი (გადახდა არ სჭირდება) */
  amountTetri: number;
  title: string;
  /** გადარიცხვის რეკვიზიტები pricing_settings-იდან; null → „მალე მიიღებ“ */
  bankRequisites: string | null;
  /** 'YYYY-MM-DD' — მხოლოდ დღის ჯავშანზე (4-პაკეტის ყიდვას თარიღი არ აქვს) */
  bookingDate?: string;
  /** ბარათით გადახდისას — Flitt-ის გვერდის მისამართი */
  redirectUrl?: string | null;
};

export type EntryState = {
  status: "idle" | "success" | "error" | "otp";
  message?: string;
  errors?: Record<string, string>;
  /** გადმორიცხვისას, უცნობი ნომრისთვის — status:"otp"-ზე ივსება (§4) */
  otp?: OtpChallenge;
  order?: EntryOrder;
};

export const initialEntryState: EntryState = { status: "idle" };
