import type { TextGroup } from "../types";

export const storiesTexts: TextGroup = {
  slug: "stories",
  title: "ისტორიები",
  entries: [
    {
      key: "stories.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "ისტორიები",
    },
    {
      key: "stories.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default:
        "ამბები „სივრციდან“ და წევრების ნამუშევრები - ტექსტები, ვიდეოები და კვლევები.",
    },
    {
      key: "stories.hero.eyebrow",
      label: "ზედა წარწერა (eyebrow)",
      kind: "text",
      default: "ისტორიები",
    },
    {
      key: "stories.hero.title",
      label: "მთავარი სათაური",
      kind: "text",
      default: "რა ხდება სივრცეში",
    },
    {
      key: "stories.hero.lead",
      label: "შესავალი აბზაცი",
      kind: "textarea",
      default:
        "ამბები ჩვენი ცენტრიდან და წევრების შექმნილი ნამუშევრები - ის, რასაც ვერცერთი აღწერა ვერ გადმოსცემს.",
    },
    {
      key: "stories.tabs.news",
      label: "ტაბი - ამბები",
      kind: "text",
      default: "ამბები",
    },
    {
      key: "stories.tabs.works",
      label: "ტაბი - ნამუშევრები",
      kind: "text",
      default: "ნამუშევრები",
    },
    {
      key: "stories.works.kind.all",
      label: "ნამუშევრები - ფილტრი „ყველა“",
      kind: "text",
      default: "ყველა",
    },
    {
      key: "stories.works.kind.texts",
      label: "ნამუშევრები - ფილტრი „ტექსტები“",
      kind: "text",
      default: "ტექსტები",
    },
    {
      key: "stories.works.kind.video",
      label: "ნამუშევრები - ფილტრი „ვიდეო“",
      kind: "text",
      default: "ვიდეო",
    },
    {
      key: "stories.works.kind.research",
      label: "ნამუშევრები - ფილტრი „კვლევები“",
      kind: "text",
      default: "კვლევები",
    },
    {
      key: "stories.works.texts.more",
      label: "ნამუშევრები - ტექსტების „სრულად“ ღილაკი",
      kind: "text",
      default: "სრულად",
    },
    {
      key: "stories.works.download",
      label: "კვლევა - გადმოწერის ღილაკი",
      kind: "text",
      default: "გადმოწერე PDF",
    },
    {
      key: "stories.empty.works.title",
      label: "ცარიელი ნამუშევრები - სათაური",
      kind: "text",
      default: "ნამუშევრები ჯერ არ არის",
    },
    {
      key: "stories.empty.works.description",
      label: "ცარიელი ნამუშევრები - აღწერა",
      kind: "text",
      default: "სეზონის ბოლოს აქ გამოჩნდება წევრების ნამუშევრები.",
    },
    {
      key: "stories.empty.posts.title",
      label: "ცარიელი ამბები - სათაური",
      kind: "text",
      default: "ამბები ჯერ არ არის",
    },
    {
      key: "stories.empty.posts.description",
      label: "ცარიელი ამბები - აღწერა",
      kind: "text",
      default: "კონტენტი მალე დაემატება - შემოიარე ცოტა ხანში.",
    },
    {
      key: "stories.detail.back",
      label: "პოსტის გვერდი - უკან ბმული",
      kind: "text",
      default: "← ყველა ისტორია",
    },
  ],
};
