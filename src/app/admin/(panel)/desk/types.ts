import type { DeskSearchResult } from "@/lib/db/queries/desk";

/**
 * მისაღების ძებნის state — ცალკე ფაილში, რადგან "use server" მოდულს
 * (./actions.ts) მხოლოდ async ფუნქციების ექსპორტი შეუძლია.
 */
export type DeskState = {
  status: "idle" | "error" | "success";
  message?: string;
  results?: DeskSearchResult;
};

export const initialDeskState: DeskState = { status: "idle" };

/** „მიღების" (ვიზიტის აღრიცხვის) ღილაკის state — duplicate-ზე იგივე ფორმა
 *  force=1-ით მეორედ იგზავნება („მაინც აღრიცხე") */
export type AdmitState = {
  status: "idle" | "error" | "success" | "duplicate";
  message?: string;
};

export const initialAdmitState: AdmitState = { status: "idle" };
