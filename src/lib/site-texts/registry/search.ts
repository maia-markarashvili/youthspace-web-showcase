import type { TextGroup } from "../types";

export const searchTexts: TextGroup = {
  slug: "search",
  title: "ძებნა",
  entries: [
    {
      key: "search.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "ძებნა",
    },
    {
      key: "search.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default: "მოძებნე კლუბები, კურსები, სივრცეები და ამბები „სივრცეში“.",
    },
    {
      key: "search.hero.eyebrow",
      label: "ზედა წარწერა (eyebrow)",
      kind: "text",
      default: "ძებნა",
    },
    {
      key: "search.hero.title",
      label: "მთავარი სათაური",
      kind: "text",
      default: "რას ეძებ?",
    },
    {
      key: "search.input.placeholder",
      label: "ველის placeholder",
      kind: "text",
      default: "მაგ. დებატები, ბიზნესი, პოეზია…",
    },
    {
      key: "search.button",
      label: "ძებნის ღილაკი",
      kind: "text",
      default: "ძებნა",
    },
    {
      key: "search.hint.empty",
      label: "მინიშნება - ცარიელი ველი",
      kind: "text",
      default: "ჩაწერე საძიებო სიტყვა და დააჭირე ძებნას.",
    },
    {
      key: "search.hint.short",
      label: "მინიშნება - ძალიან მოკლე query",
      kind: "text",
      default: "ჩაწერე მინიმუმ 2 სიმბოლო.",
    },
    {
      key: "search.group.clubs",
      label: "ჯგუფი - კლუბები",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "search.group.courses",
      label: "ჯგუფი - კურსები",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "search.group.posts",
      label: "ჯგუფი - ამბები და ნამუშევრები",
      kind: "text",
      default: "ამბები და ნამუშევრები",
    },
    {
      key: "search.empty.title",
      label: "ვერაფერი მოიძებნა - სათაური",
      kind: "text",
      default: "ვერაფერი მოიძებნა",
    },
    {
      key: "search.empty.description",
      label: "ვერაფერი მოიძებნა - აღწერა",
      kind: "text",
      default: "სცადე სხვა სიტყვით ან გაეცანი კლუბებს პირდაპირ.",
    },
  ],
};
