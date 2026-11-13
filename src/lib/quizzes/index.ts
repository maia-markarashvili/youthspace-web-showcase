import { clubMatchQuiz } from "./club-match";

/**
 * ტესტების რეესტრი — MVP-ში ტესტები კოდშია (მომხმარებლის გადაწყვეტილება);
 * ადმინ-რედაქტორი მოგვიანებით, ფაზა 2-ის კანდიდატია. წმინდა მოდულია
 * (server-only არ არის) — sitemap-იც და გვერდებიც იმპორტებენ.
 */

export type QuizOption = {
  label: string;
  /** კლუბის slug → ქულა (+2 ძირითადი, +1 მეორადი) */
  scores: Record<string, number>;
};

export type QuizQuestion = {
  title: string;
  options: QuizOption[];
};

export type Quiz = {
  slug: string;
  title: string;
  description: string;
  /** კლუბების პრიორიტეტი ტოლი ქულების დროს (პირველი იმარჯვებს) */
  clubOrder: string[];
  questions: QuizQuestion[];
};

export const QUIZZES: Quiz[] = [clubMatchQuiz];

export function getQuizBySlug(slug: string): Quiz | null {
  return QUIZZES.find((quiz) => quiz.slug === slug) ?? null;
}
