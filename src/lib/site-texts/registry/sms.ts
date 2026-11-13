import type { TextGroup } from "../types";

/**
 * SMS-შეტყობინებების შაბლონები (ubill.dev).
 *
 * ორი წესი, რომელიც ადმინმა უნდა იცოდეს და ლეიბლებშივე წერია:
 *  1. **ცარიელი ტექსტი = ეს SMS არ იგზავნება** — ჩართვა/გამორთვა აქედან ხდება;
 *  2. ქართული SMS 70 სიმბოლოს იტევს — გრძელი ტექსტი ორ SMS-ად ითვლება
 *     და ორჯერ ჯდება.
 */
export const smsTexts: TextGroup = {
  slug: "sms",
  title: "SMS",
  entries: [
    {
      key: "sms.order.pending",
      label:
        "შეკვეთისას (გადახდის მოლოდინში) · {code} {amount} {item} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default:
        "სივრცე: კოდი {code}, თანხა {amount}. გადმორიცხე, დაგიდასტურებთ.",
    },
    {
      key: "sms.order.confirmed",
      label:
        "გადახდის დადასტურებისას · {code} {item} {qrUrl} (ბმული ლათინურია - SMS გაძვირდება) · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: გადახდა დადასტურდა. {item}",
    },
    {
      key: "sms.booking.confirmed",
      label:
        "ჯავშნის დადასტურებისას (აბონემენტით) · {date} {slot} {code} {qrUrl} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: ჯავშანი დადასტურდა - {date}, {slot}",
    },
    {
      key: "sms.registration.confirmed",
      label:
        "უფასო რეგისტრაციისას (ადგილი მაშინვე დასტურდება) · {code} {item} {date} {qrUrl} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: ადგილი დაჯავშნულია! კოდი {code}. გელოდებით.",
    },
    {
      key: "sms.order.cancelled",
      label:
        "კაბინეტიდან გაუქმებისას · {code} {item} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: შეკვეთა {code} გაუქმდა. თანხა იმავე არხით დაგიბრუნდება.",
    },
    {
      key: "sms.booking.released",
      label:
        "პასით ჯავშნის გაუქმებისას (შესვლა პასზე ბრუნდება) · {code} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: ჯავშანი {code} გაუქმდა - შესვლა დაგიბრუნდა პასზე.",
    },
    {
      key: "sms.order.refunded",
      label:
        "ბარათზე თანხის დაბრუნებისას (Flitt-ის დასტური) · {code} {item} {amount} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default:
        "სივრცე: შეკვეთაზე {code} თანხა {amount} დაგიბრუნდა ბარათზე. ჩარიცხვა ბანკზეა დამოკიდებული.",
    },
    {
      key: "sms.code.reminder",
      label:
        "ადმინის „კოდის გაგზავნა“ ღილაკით · {code} {qrUrl} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      default: "სივრცე: შენი კოდია {code}. ჯავშნები: youthspace.ge/account",
    },
    {
      key: "sms.installment.due",
      label:
        "განვადება - „თვიური გადასახდელია“ (ადმინის ღილაკით) · {amount} {code} {date} {paid} {total} {item} · ცარიელი = არ იგზავნება",
      kind: "textarea",
      disablable: true,
      /* ქართული SMS 70 სიმბოლოა — {item} განზრახ არ არის default-ში,
         რომ გრძელმა სათაურმა SMS ორად არ გაყოს */
      default: "სივრცე: კურსის თვიური {amount} გადასახდელია. კოდი {code}",
    },
    {
      key: "sms.otp.code",
      label:
        "დადასტურების კოდი (გადმორიცხვით ყიდვისას, უცნობი ნომრისთვის) · {code} · ⚠ ვერ გამოირთვება - ცარიელი ან {code}-ის გარეშე დაწერილი ტექსტი საწყისს დაუბრუნდება, თორემ ყიდვა შეუძლებელი გახდებოდა",
      kind: "textarea",
      default: "სივრცე: დადასტურების კოდი {code}. მოქმედებს 10 წუთი.",
    },
  ],
};
