/**
 * ფორმის საერთო state-ტიპები — ცალკე ფაილში, რადგან "use server" მოდულს
 * (app/actions.ts) ამ Next-ვერსიაში მხოლოდ async ფუნქციების ექსპორტი
 * შეუძლია; ობიექტის ექსპორტი runtime-შეცდომას იძლევა (invalid-use-server-value).
 */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };
