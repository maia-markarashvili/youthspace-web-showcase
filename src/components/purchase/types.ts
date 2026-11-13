import type { OtpChallenge } from "@/lib/otp";

/**
 * ყიდვის ფორმების საერთო state — ცალკე ფაილში, რადგან "use server" მოდულს
 * მხოლოდ async ფუნქციების ექსპორტი შეუძლია (იხ. src/lib/form-state.ts).
 */
export type PurchaseState = {
  status: "idle" | "success" | "error" | "otp";
  message?: string;
  errors?: Record<string, string>;
  /** გადმორიცხვისას, უცნობი ნომრისთვის — status:"otp"-ზე ივსება (§4) */
  otp?: OtpChallenge;
  order?: {
    orderRef: string;
    amountTetri: number;
    standardTetri: number;
    title: string;
    bankRequisites: string | null;
    /** მოქმედი ფასდაკლება ამ ყიდვაზე (მეგობრის კოდი/კრედიტი); 0 = არა */
    appliedDiscountPercent: number;
    /** ბარათით გადახდისას — Flitt-ის გვერდის მისამართი */
    redirectUrl?: string | null;
  };
};

export const initialPurchaseState: PurchaseState = { status: "idle" };

/** თანხმობის მოსანიშნების ტექსტები — ცალკე ტიპად, რადგან სივრცის ფორმას
 *  (გადახდის გარეშე) მხოლოდ ეს სჭირდება, PayTexts კი მთლიანად აზისტებს */
export type ConsentTexts = {
  consentTermsPre: string;
  consentTermsLink: string;
  consentPrivacyPre: string;
  consentPrivacyLink: string;
};

/** გადახდის ტექსტები სერვერიდან კლიენტ-ფორმებში (site_texts → props) */
export type PayTexts = ConsentTexts & {
  methodLabel: string;
  methodCard: string;
  methodTransfer: string;
  redirectNotice: string;
  redirectFallback: string;
};
