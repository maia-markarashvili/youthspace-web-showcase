import type { TextGroup } from "../types";

/**
 * ელფოსტის შაბლონები — SMS-ის (registry/sms.ts) იგივე პრინციპით: სათაური
 * და ტექსტი ცალკე ჩანაწერებია, ორივე disablable. იგზავნება მხოლოდ მაშინ,
 * თუ **ორივე** შევსებულია - ერთის ცარიელობაც კმარა, რომ ეს წერილი
 * საერთოდ არ გაიგზავნოს.
 *
 * ქართული SMS-ისგან განსხვავებით სიგრძის შეზღუდვა არაა, მაგრამ ტოკენების
 * კონვენცია იგივეა: {name} {code} {item} {amount} {date} {slot}
 * {requisites} {myUrl} {remaining}.
 */
export const emailTexts: TextGroup = {
  slug: "email",
  title: "ელფოსტა",
  entries: [
    {
      key: "email.order.pending.subject",
      label:
        "შეკვეთისას · სათაური · {code} {item} · ცარიელი (ან ტექსტის ცარიელობა) = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - შეკვეთა {code}",
    },
    {
      key: "email.order.pending.body",
      label:
        "შეკვეთისას · ტექსტი · {name} {code} {item} {amount} {requisites} {myUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშენი შეკვეთა მიღებულია.\n\nკოდი: {code}\nსერვისი: {item}\nგადასახდელი: {amount}\n\nგადარიცხვის რეკვიზიტები:\n{requisites}\n\nგადარიცხვის შემდეგ ადმინი დაადასტურებს.\nჯავშნის ნახვა: {myUrl}",
    },
    {
      key: "email.order.confirmed.subject",
      label:
        "დადასტურებისას · სათაური · {code} {item} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - გადახდა დადასტურდა ({code})",
    },
    {
      key: "email.order.confirmed.body",
      label: "დადასტურებისას · ტექსტი · {name} {code} {item} {myUrl} {qrUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nგადახდა დადასტურდა - სერვისი აქტიურია.\n\nსერვისი: {item}\nკოდი: {code}\n\nQR-ბილეთი (აჩვენე მისაღებში): {qrUrl}\nჯავშნის ნახვა: {myUrl}\n\nველოდებით!",
    },
    {
      key: "email.booking.confirmed.subject",
      label:
        "ჯავშნისას · სათაური · {date} {slot} {code} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - ჯავშანი დადასტურდა {date}",
    },
    {
      key: "email.booking.confirmed.body",
      label:
        "ჯავშნისას · ტექსტი · {name} {date} {slot} {code} {remaining} {myUrl} {qrUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nჯავშანი დადასტურდა.\n\nთარიღი: {date}\nდრო: {slot}\nკოდი: {code}\n\nQR-ბილეთი (აჩვენე მისაღებში): {qrUrl}\n\nპასზე დაგრჩა {remaining} შესვლა.\nჯავშნის ნახვა: {myUrl}",
    },
    {
      key: "email.registration.confirmed.subject",
      label:
        "უფასო რეგისტრაციისას · სათაური · {code} {item} · ცარიელი (ან ტექსტის ცარიელობა) = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - ადგილი დაჯავშნულია ({code})",
    },
    {
      key: "email.registration.confirmed.body",
      label:
        "უფასო რეგისტრაციისას · ტექსტი · {name} {code} {item} {date} {myUrl} {qrUrl} · {date} ცარიელია, თუ თარიღი მითითებული არ არის",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშენი ადგილი დაჯავშნულია.\n\nღონისძიება: {item}\nკოდი: {code}\n\nQR-ბილეთი (აჩვენე მისაღებში): {qrUrl}\nჯავშნის ნახვა: {myUrl}\n\nგელოდებით!",
    },
    {
      key: "email.order.cancelled.subject",
      label:
        "კაბინეტიდან გაუქმებისას · სათაური · {code} {item} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - შეკვეთა გაუქმდა ({code})",
    },
    {
      key: "email.order.cancelled.body",
      label: "კაბინეტიდან გაუქმებისას · ტექსტი · {name} {code} {item} {myUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშენი შეკვეთა გაუქმდა.\n\nსერვისი: {item}\nკოდი: {code}\n\nთუ გადახდილი გქონდა, თანხა იმავე არხით დაგიბრუნდება რამდენიმე სამუშაო დღეში.\n\nანგარიში: {myUrl}",
    },
    {
      key: "email.booking.released.subject",
      label:
        "პასით ჯავშნის გაუქმებისას · სათაური · {code} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - ჯავშანი გაუქმდა ({code})",
    },
    {
      key: "email.booking.released.body",
      label: "პასით ჯავშნის გაუქმებისას · ტექსტი · {name} {code} {item} {myUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშენი ჯავშანი გაუქმდა.\n\nსერვისი: {item}\nკოდი: {code}\n\nგამოუყენებელი შესვლა პასზე დაგიბრუნდა - ახალი ჯავშანი ნებისმიერ დროს შეგიძლია.\n\nანგარიში: {myUrl}",
    },
    {
      key: "email.order.refunded.subject",
      label:
        "ბარათზე თანხის დაბრუნებისას · სათაური · {code} {amount} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - თანხა დაბრუნდა ({code})",
    },
    {
      key: "email.order.refunded.body",
      label:
        "ბარათზე თანხის დაბრუნებისას · ტექსტი · {name} {code} {item} {amount} {myUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშეკვეთაზე {code} ({item}) თანხა {amount} დაბრუნდა შენს ბარათზე.\n\nჩარიცხვას ბანკი ამუშავებს - ჩვეულებრივ რამდენიმე სამუშაო დღეში აისახება.\n\nანგარიში: {myUrl}",
    },
    {
      key: "email.installment.due.subject",
      label:
        "განვადება - თვიური გადასახდელია · სათაური · {item} {code} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - თვიური გადასახდელია",
    },
    {
      key: "email.installment.due.body",
      label:
        "განვადება - თვიური გადასახდელია · ტექსტი · {name} {item} {amount} {date} {paid} {total} {next} {code} {myUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nკურსზე „{item}“ მორიგი თვიური გადასახდელია: {amount} ({date}-მდე).\nგადახდილია {paid} თვე {total}-იდან, ახლა {next}-ე თვეა.\n\nკოდი: {code}\nშენი ჯავშნები: {myUrl}\n\nგადახდა ადგილზე ან გადმორიცხვით - დაგვიკავშირდი და მოვაგვარებთ.",
    },
    {
      key: "email.code.reminder.subject",
      label: "კოდის შეხსენება (ადმინის ღილაკი) · სათაური · {code} · ცარიელი = არ იგზავნება",
      kind: "text",
      disablable: true,
      default: "სივრცე - შენი კოდი",
    },
    {
      key: "email.code.reminder.body",
      label: "კოდის შეხსენება · ტექსტი · {name} {code} {myUrl} {qrUrl}",
      kind: "textarea",
      disablable: true,
      default:
        "გამარჯობა, {name}!\n\nშენი კოდია {code}.\nQR-ბილეთი (აჩვენე მისაღებში): {qrUrl}\nჯავშნის სანახავად ან გასაუქმებლად: {myUrl}",
    },
  ],
};
