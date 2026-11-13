import type { OtpChallenge } from "@/lib/otp";

/**
 * ღონისძიების ჯავშნის ფორმის საერთო ტიპები — ცალკე ფაილში, რადგან
 * "use server" მოდულს (booking-actions.ts) მხოლოდ async ფუნქციების
 * ექსპორტი შეუძლია. drop-in-ის EntryState-ის ანალოგი: აქ გადახდა
 * ონლაინ ხდება (ბარათი/გადარიცხვა), ამიტომ თანხა/redirect/რეკვიზიტებიც
 * შედეგშია.
 */

export type EventBookingOrder = {
  /** SPC-##### — ტელეფონთან ერთად იდენტიფიკატორი კაბინეტში */
  orderRef: string;
  title: string;
  /** თეთრებში — წარმატების ბარათი აჩვენებს */
  amountTetri: number;
  /** 'YYYY-MM-DD' */
  bookingDate: string;
  /** გადარიცხვის რეკვიზიტები (ბარათის ნაკადში null) */
  bankRequisites: string | null;
  /** Flitt checkout-ის ბმული — ბარათით გადახდისას */
  redirectUrl?: string | null;
};

export type EventBookingState = {
  status: "idle" | "success" | "error" | "otp";
  message?: string;
  errors?: Record<string, string>;
  /** მობილურის დადასტურებისას - status:"otp"-ზე ივსება */
  otp?: OtpChallenge;
  order?: EventBookingOrder;
};

export const initialEventBookingState: EventBookingState = { status: "idle" };
