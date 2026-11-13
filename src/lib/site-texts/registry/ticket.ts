import type { TextGroup } from "../types";

/** საჯარო QR-ბილეთის გვერდი (/ticket/<token>) — მეილის ბმულიდან იხსნება */
export const ticketTexts: TextGroup = {
  slug: "ticket",
  title: "QR-ბილეთი",
  entries: [
    {
      key: "ticket.title",
      label: "ბილეთის სათაური",
      kind: "text",
      default: "QR-ბილეთი",
    },
    {
      key: "ticket.hint",
      label: "მინიშნება QR-ის ქვეშ",
      kind: "textarea",
      default:
        "აჩვენე ეს QR-კოდი მისაღებში - თანამშრომელი ტელეფონით დაასკანერებს და შესვლას აღრიცხავს.",
    },
    {
      key: "ticket.invalid",
      label: "არასწორი/ვადაგასული ბმულის ტექსტი",
      kind: "textarea",
      default:
        "ბილეთი ვერ მოიძებნა - ბმული შეამოწმე ან მოგვწერე და ხელახლა გამოგიგზავნით.",
    },
    {
      key: "ticket.inactive",
      label: "არააქტიური ჩანაწერის ტექსტი",
      kind: "textarea",
      default: "ეს ჩანაწერი აღარ არის აქტიური - QR-კოდი აღარ მოქმედებს.",
    },
  ],
};
