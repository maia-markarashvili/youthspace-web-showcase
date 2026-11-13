/**
 * საწყისი seed — PRD §6 („საწყისი seed") და §5.1.
 *
 * ეს **არ არის** პროდუქტის მუდმივი წყარო: seed-ის შემდეგ ყველა კონტენტი და
 * ფასი admin პანელიდან იმართება (§5.8). ფასები აქ **placeholder-ია თეთრში**.
 *
 * გაშვება:  npm run db:seed   (idempotent — slug-ზე onConflictDoNothing)
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import bcrypt from "bcryptjs";
import { toTetri } from "../money";
import { CLUB_SEED } from "./club-seed";
import { closeDb, createDb } from "./connect";
import { COURSE_ARCHIVE_2026 } from "./course-archive-2026-data";
import { NEWS_2026 } from "./news-2026-data";
import {
  LITKONKURSI_2026_FOOTNOTE,
  LITKONKURSI_2026_WINNERS,
  LITKONKURSI_PSEUDO_CLUB,
} from "./litkonkursi-2026-data";
import {
  adminUsers,
  clubs,
  contentPosts,
  courses,
  dropinSettings,
  heroSlides,
  pricingSettings,
  spaces,
} from "./schema";

/* დრაივერი connect.ts-ის ლოგიკით: Neon (DATABASE_URL) ან ლოკალური PGlite */
const db = createDb({ maxConnections: 1 });

/* ── 4 კლუბი (ახალი კონცეფცია, 2026-08) — მონაცემები ./club-seed.ts-შია,
   რომ replace-clubs.ts-მაც გამოიყენოს ── */

/* ── სივრცეები — ღონისძიების ერთიან მოდელზე (2026-08-30) მხოლოდ ერთი
   აქტიური რიგია (sruli-sivrce): საჯარო გვერდი მის კონტენტს აჩვენებს.
   ორი ძველი ოთახი კონტენტის შესანარჩუნებლად რჩება, მაგრამ inactive-ია ── */
const SPACE_SEED = [
  {
    slug: "patara-otaxi",
    title: "პატარა ოთახი",
    description:
      "მყუდრო ოთახი გუნდური შეხვედრებისთვის, ინტერვიუებისთვის და მცირე ვორქშოფებისთვის.",
    capacity: 8,
    inventory: ["ეკრანი", "თეთრი დაფა", "Wi-Fi", "კონდიციონერი", "წყალი/ყავა"],
    sortOrder: 1,
    isActive: false,
  },
  {
    slug: "didi-darbazi",
    title: "დიდი დარბაზი",
    description:
      "ტრენინგებისთვის, პრეზენტაციებისთვის და ღონისძიებებისთვის განკუთვნილი დარბაზი მოძრავი ავეჯით, სცენით და აკუსტიკური ჭერით.",
    coverImage: "/images/hall-panel.jpg",
    gallery: ["/images/club-moazrovneta.jpg", "/images/club-socialuri.jpg"],
    capacity: 40,
    inventory: [
      "პროექტორი და ეკრანი",
      "მიკროფონი და დინამიკები",
      "მოძრავი სკამები",
      "თეთრი დაფა",
      "Wi-Fi",
    ],
    sortOrder: 2,
    isActive: false,
  },
  {
    slug: "sruli-sivrce",
    title: "სრული სივრცე",
    description:
      "მთელი ცენტრი ერთი ღონისძიებისთვის - დარბაზი, ოთახები და საერთო ზონა ერთად.",
    coverImage: "/images/about-brand.jpg",
    gallery: [
      "/images/hero.webp",
      "/images/hall-panel.jpg",
      "/images/parents-workshop.jpg",
    ],
    capacity: 80,
    inventory: [
      "დარბაზი + ორი ოთახი",
      "სამზარეულო/ქეთერინგის ზონა",
      "სრული ტექნიკა",
      "ღონისძიების მხარდაჭერა",
      "Wi-Fi",
    ],
    sortOrder: 3,
  },
];

/* ── ფასების კონფიგი (გაყიდვების მოდელი) — admin ცვლის /admin/pricing-ზე ── */
const PRICING_SEED = {
  id: 1,
  clubPrice: toTetri(120),
  singleEntryPrice: toTetri(20),
  fourPackPrice: toTetri(60),
  clubSeatCapacity: 30,
  referralDiscountPercent: 10,
  entryCapacityMorning: 15,
  entryCapacityMidday: 0,
  entryCapacityEvening: 15,
  fourPackValidityDays: 30,
  renewalGraceDays: 5,
  /* ღონისძიების სლოტის ფასები; ხალხის საფეხურები unset → კოდის default */
  eventPriceMorning: toTetri(100),
  eventPriceMidday: toTetri(150),
  eventPriceEvening: toTetri(200),
};

/* ── კურსები — რეალური პროგრამები FB გვერდიდან; ფასები საწყისი
   მნიშვნელობებია და ცოცხალზე ადმინიდან იმართება.
   clubDiscounts (per-club %) კლუბების ჩასმის შემდეგ, slug→id მაპით იწყობა ── */
const COURSE_SEED = (clubIdBySlug: Map<string, string>) => {
  const discounts = (...rules: [slug: string, percent: number][]) =>
    rules.flatMap(([slug, percent]) => {
      const clubId = clubIdBySlug.get(slug);
      return clubId ? [{ clubId, percent }] : [];
    });

  return [
    {
      slug: "kritikuli-azrovneba",
      title: "კრიტიკული და მოქნილი აზროვნების კურსი",
      description:
        "კურსი გასწავლის ინფორმაციის სანდოობის შეფასებას და სხვების ზეგავლენისგან თავდაცვას, არგუმენტის აგებასა და დაცვას, საკუთარი აზრის გადახედვას ახალი მტკიცებულებების საფუძველზე და გაურკვევლობაში გადაწყვეტილების მიღებას. ფორმატი: 20% თეორია, 30% დისკუსია, 50% პრაქტიკული დავალებები.",
      category: "კურსი",
      lecturer: "მაია მარქარაშვილი",
      scheduleText: "ხუთშაბათობით, 19:00 - 8 შეხვედრა",
      startDate: "2026-10-18",
      coverImage: "/images/course-kritikuli-azrovneba.webp",
      gallery: [],
      capacity: 16,
      priceRegular: toTetri(220),
      clubDiscounts: discounts(["moazrovneebi", 10]),
      landing: {
        program: [
          {
            title: "1. გონებრივი მიკერძოებები",
            text: "დასტურის მიკერძოება, პირველი შთაბეჭდილების ეფექტი, ჯგუფური აზროვნება",
          },
          {
            title: "2. არგუმენტაცია და ლოგიკა",
            text: "არგუმენტის სტრუქტურა, ლოგიკური შეცდომები; ფაქტი, ემოცია, ინტერპრეტაცია",
          },
          {
            title: "3. მედიაწიგნიერება და ციფრული გარემო",
            text: "ინფორმაციის გადამოწმების 3-ნაბიჯიანი მოდელი, ალგორითმული ბუშტები, ვიზუალური მასალის კრიტიკული ანალიზი, AI-სთან „მეგობრობა“ - რისკები და შესაძლებლობები",
          },
          {
            title: "4. აზროვნების მოქნილობა და გადაწყვეტილება",
            text: "პრობლემა თუ გამოწვევა?, ინტელექტუალური თავმდაბლობა, მრავალპერსპექტიულობა, ინტელექტუალური გამბედაობა, აზრის დაცვა ჯგუფის წინაშე",
          },
          {
            title: "5. გადაწყვეტილების მიღება",
            text: "გადაწყვეტილების ჩარჩოები (რისკის ანალიზი, ალტერნატივების შედარება), გაურკვევლობა, მარკეტინგის გავლენა",
          },
        ],
      },
    },
  ];
};

async function main() {
  console.log("→ seed იწყება…");

  /* კლუბები */
  await db.insert(clubs).values(CLUB_SEED).onConflictDoNothing({
    target: clubs.slug,
  });
  console.log(`  ✓ clubs (${CLUB_SEED.length})`);

  /* ფსევდო-კლუბი „ლიტერატურული კონკურსი" — CLUB_SEED-ში განზრახ არ შედის
     (იმ მასივს replace-clubs.ts-იც იყენებს) */
  await db
    .insert(clubs)
    .values(LITKONKURSI_PSEUDO_CLUB)
    .onConflictDoNothing({ target: clubs.slug });
  console.log("  ✓ clubs (ლიტ. კონკურსის ფსევდო-კლუბი)");

  /* სივრცეები */
  await db.insert(spaces).values(SPACE_SEED).onConflictDoNothing({
    target: spaces.slug,
  });
  console.log(`  ✓ spaces (${SPACE_SEED.length})`);

  /* ფასების კონფიგი (singleton) */
  await db
    .insert(pricingSettings)
    .values(PRICING_SEED)
    .onConflictDoNothing({ target: pricingSettings.id });
  console.log("  ✓ pricing_settings");

  /* კურსები — clubDiscounts-ს ჩასმული კლუბების რეალური id-ები სჭირდება */
  const clubIdBySlug = new Map(
    (await db.select({ id: clubs.id, slug: clubs.slug }).from(clubs)).map(
      (club) => [club.slug, club.id],
    ),
  );
  const courseSeed = COURSE_SEED(clubIdBySlug);
  await db.insert(courses).values(courseSeed).onConflictDoNothing({
    target: courses.slug,
  });
  console.log(`  ✓ courses (${courseSeed.length})`);

  /* დასრულებული კურსები/შეხვედრები (2026 არქივი) */
  await db
    .insert(courses)
    .values(COURSE_ARCHIVE_2026)
    .onConflictDoNothing({ target: courses.slug });
  console.log(`  ✓ courses არქივი (${COURSE_ARCHIVE_2026.length})`);

  /* drop-in singleton */
  await db
    .insert(dropinSettings)
    .values({
      id: 1,
      price: toTetri(20),
      dailyCap: 25,
      description:
        "ერთჯერადი შესვლა სივრცეში - სამუშაო ადგილი, Wi-Fi, ყავა და საერთო ზონა მთელი დღის განმავლობაში.",
    })
    .onConflictDoNothing({ target: dropinSettings.id });
  console.log("  ✓ dropin_settings");

  /* root admin */
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db
      .insert(adminUsers)
      .values({ email: adminEmail.toLowerCase(), passwordHash, role: "admin" })
      .onConflictDoNothing({ target: adminUsers.email });
    console.log(`  ✓ admin_users (${adminEmail})`);
  } else {
    console.log(
      "  · admin_users გამოტოვებულია - ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD არ არის",
    );
  }

  /* რეალური კონტენტი (§16) — facebook.com/YouthSpace.ge-ის პოსტებიდან;
     clubIdBySlug ზემოთ, კურსების ბლოკშია აწყობილი */
  const now = new Date();
  await db
    .insert(contentPosts)
    .values([
      {
        type: "news",
        slug: "sivrcis-pirveli-100-dghe",
        title: "სივრცის პირველი 100 დღე",
        body: "პირველ ეტაპზე სივრცის ინიციატივებში ჩაერთო **226 ახალგაზრდა**, 29 მშობელი და 17 პროფესიონალი - ექვსი განსხვავებული ფორმატით.\n\n## რა მოხდა ამ 100 დღეში\n\n- ბიზნესლაბორატორიის ორი კურსი\n- ლიტერატურული კონკურსი და დებატების ჩემპიონატი\n- კრიტიკული და მოქნილი აზროვნების კურსი\n- შეხვედრები მშობლებთან და ახალგაზრდებთან\n- ლიტერატურული და პიროვნული განვითარების საღამოები\n\nჩვენი მისია უცვლელია: გავხდეთ ახალგაზრდების შესაძლებლობების განვითარების ჰაბი.",
        media: ["/images/news-pirveli-100-dghe.webp", "/images/about-brand.jpg"],
        isFeatured: true,
        publishedAt: now,
      },
      {
        type: "news",
        slug: "debatebis-chempionati-2026",
        title: "დებატების ჩემპიონატი - გაიმარჯვა გუნდმა „აზიური ვეფხვები“",
        body: "6, 7 და 13 ივნისს კარლ პოპერის ფორმატის დებატებში შვიდი სკოლის X–XII კლასელები შეხვდნენ ერთმანეთს. გამარჯვება საერთაშორისო ქართული სკოლისა და 47-ე საჯარო სკოლის შერეულმა გუნდმა „აზიური ვეფხვები“ მოიპოვა, მეორე ადგილზე სკოლა-ლიცეუმ „პრომეთეს“ გუნდი „რატომ?“ გავიდა. ფინალის ჟიურიში ილია რევია და ნანა ბოჭორიშვილი ისხდნენ; გამარჯვებული გუნდის პრიზი 600 ლარი იყო.",
        collectionSlug: "debatebis-chempionati-2026",
        clubId: clubIdBySlug.get("moazrovneebi") ?? null,
        media: [
          "/images/news-debatebis-chempionati.webp",
          "/images/club-moazrovneta.jpg",
        ],
        isFeatured: true,
        publishedAt: now,
      },
      {
        type: "news",
        slug: "poeziis-saghamo",
        title: "პოეზიის საღამო ლიტერატურულ კლუბში",
        body: "სამ პოეტს ვუმასპინძლეთ - გიორგი არაბული, სალომეა ლომინაძე და შალვა ბაკურაძე საკუთარ ტექსტებს კითხულობდნენ და პოეზიაზე საუბრობდნენ.",
        clubId: clubIdBySlug.get("moazrovneebi") ?? null,
        media: [
          "/images/news-poeziis-saghamo.webp",
          "/images/literary-evening.jpg",
          "/images/club-literaturuli.webp",
        ],
        isFeatured: true,
        publishedAt: now,
      },
      {
        type: "news",
        slug: "wignebit-chvenze",
        title: "საზაფხულო ციკლი „წიგნებით ჩვენზე“",
        body: "საზაფხულო შეხვედრების ციკლი 15–19 წლის მკითხველებისთვის: პირველი შეხვედრა - „მე და სხვა ადამიანები“ („ჩანჩურა“ და „ნუ მოკლავ ჯაფარას“), მეორე - „მე და საზოგადოება“.",
        clubId: clubIdBySlug.get("moazrovneebi") ?? null,
        media: ["/images/book-quiz.jpg"],
        isFeatured: false,
        publishedAt: now,
      },
      {
        type: "news",
        slug: "mshobelta-klubis-shexvedra",
        title:
          "დამოუკიდებლობის ზღურბლზე - შეხვედრების სერია მოზარდებისა და მშობლებისთვის",
        body: "გზა თვითგამორკვევიდან მომავალ პროფესიამდე - შეხვედრების სერია მოზარდებისა და მშობლებისთვის:\n\n- ნინო ბერუაშვილი - მშობლები · 27.05\n- რუსუდან კვაჭანტირაძე - მოზარდები · 29.05\n- თეონა ბაღათურია - მოზარდები · 05.06\n- მედეა ტაბატაძე - ორივე · 10.06\n- მაია მარქარაშვილი - ორივე · 17.06\n\nადგილები შეზღუდულია. მონაწილეებს გადაეცემათ სერტიფიკატი და პერსონალური რუკა.",
        media: [
          "/images/news-damoukideblobis-zghurblze.webp",
          "/images/parents-workshop.jpg",
        ],
        isFeatured: false,
        publishedAt: now,
      },
      {
        type: "news",
        slug: "initsiativebis-konkursi-2026",
        title: "კონკურსი „ახალგაზრდობა. იდეები. მოქმედება.“",
        body: "სივრცე აცხადებს ახალგაზრდული ინიციატივების კონკურსს „ახალგაზრდობა. იდეები. მოქმედება.“ - ის ეძღვნება 12 აგვისტოს, ახალგაზრდობის საერთაშორისო დღეს.\n\nკონკურსის იდეაა, ახალგაზრდებს მისცეს შესაძლებლობა, სივრცის კლუბების შეხვედრის ფარგლებში განახორციელონ საკუთარი ინიციატივა - აქტივობა, ვორქშოფი, ღონისძიება ან პროექტი, რომელსაც თავად წარუძღვებიან. ავტორებისთვის ეს არის პრაქტიკული გამოცდილება მზა, დაინტერესებულ აუდიტორიასთან, პორტფოლიოსთვის გამოსადეგი შედეგი და, შესაბამის შემთხვევაში, ინიციატივიდან შემოსავლის მიღების შესაძლებლობაც.\n\n## ვის შეუძლია მონაწილეობა\n\n- 16-დან 23 წლის ჩათვლით ახალგაზრდებს - ინდივიდუალურად ან გუნდურად;\n- ასევე ნებისმიერი ასაკის პირს, რომელსაც ახალგაზრდებთან მუშაობის გამოცდილება ან შესაბამისი პროფესიული ცოდნა აქვს.\n\n## როგორი უნდა იყოს ინიციატივა\n\n- პასუხობდეს ერთ-ერთი კლუბის (მოაზროვნეები, ინოვატორები, ლიდერები, მეწარმეები) მიზანსა და მიმართულებას;\n- მოიცავდეს არაუმეტეს 3 შეხვედრას, თითოეული - 90 წუთამდე;\n- წარუძღვეს თავად ავტორი ან მისი გუნდი;\n- ქმნიდეს კონკრეტულ შედეგს - პროტოტიპს, ტექსტს, ვიდეოს, კამპანიას ან სხვა წარმოდგენად ნამუშევარს.\n\n## რას იღებს ავტორი\n\n- ორენოვან სერტიფიკატს და, შეთანხმებით, სარეკომენდაციო წერილს;\n- სივრცეს, აღჭურვილობასა და ორგანიზაციულ მხარდაჭერას - მასალები ერთ ინიციატივაზე 200 ლარამდე;\n- მზა, დაინტერესებულ აუდიტორიას - კლუბის წევრებს და, სურვილისას, გარე მონაწილეებს;\n- შემოსავლიანი ინიციატივის შემთხვევაში - მოგების 50%-ს;\n- მონაწილეობას სივრცის ფესტივალში და გამარჯვების შესაძლებლობას ნომინაციებში.\n\n## ვადები\n\n- **განაცხადების მიღება - 2026 წლის 7 სექტემბრის 23:59-მდე**;\n- შედეგები გამოცხადდება 14 სექტემბერს;\n- ინიციატივები განხორციელდება 29 სექტემბრიდან დეკემბრის ჩათვლით, კლუბების საკვირაო შეხვედრების ფარგლებში;\n- წლის ბოლოს - სივრცის ფესტივალი: წარდგენა, ნომინაციები და პრიზები.\n\nგანაცხადის შევსება: [forms.gle/j8TLVUUkuezQke8aA](https://forms.gle/j8TLVUUkuezQke8aA). კითხვების სრული ჩამონათვალი და დეტალური პირობები იხილე თანდართულ დოკუმენტში.",
        media: ["/images/news-initsiativebis-konkursi.webp"],
        fileUrl: "/uploads/konkursi-akhalgazrdoba-ideebi-mokmedeba.pdf",
        isFeatured: true,
        publishedAt: new Date("2026-08-12T12:00:00+04:00"),
      },
      {
        type: "news",
        slug: "litkonkursi-2026-pirobebi",
        title: "ლიტერატურული კონკურსი „წიგნიდან დაწყებული ამბავი“",
        body: "სივრცე აცხადებს შემოქმედებითი ტექსტების კონკურსს „წიგნიდან დაწყებული ამბავი“ - ის ეძღვნება 23 აპრილს, წიგნისა და საავტორო უფლებების დაცვის საერთაშორისო დღეს.\n\nკონკურსის იდეაა, დააფიქროს ახალგაზრდები წიგნის გავლენასა და მნიშვნელობაზე, წაახალისოს წერა და ამბების ტექსტურად გადმოცემა.\n\n## პირობები\n\n- მონაწილეთა ასაკი - 13-დან 23 წლის ჩათვლით;\n- საკონკურსო ტექსტი - ესე, მოთხრობა, წერილი ან სხვა თავისუფალი ფორმა ქართულ ენაზე, რომელიც წიგნთან დაკავშირებულ ამბავს გადმოსცემს;\n- მოცულობა - არაუმეტეს 5,000 სიმბოლო;\n- ტექსტები მიიღება 2026 წლის 15 აპრილის ჩათვლით; გამარჯვებულები გამოვლინდებიან 23 აპრილს, დაჯილდოება - 2 მაისს.\n\n## ჟიური\n\nგიორგი კეკელიძე, ნათია როსტიაშვილი, თამარ გეგეშიძე, ლილი ალფაიძე და ანა გოგილაშვილი.\n\n## პრიზები\n\nკონკურსს ეყოლება 23 გამარჯვებული - თითოეული მიიღებს სერტიფიკატს, 5 წიგნს გამომცემლობებისგან („ინტელექტი“, „დიოგენე“, „სულაკაურის გამომცემლობა“) და ფასდაკლების ვაუჩერებს სივრცის კურსებზე.\n\nპირველ სამ ადგილს კონკურსის გენერალური სპონსორი, სს „ბაზისბანკი“ დააჯილდოებს: **I ადგილი - 800 ლარი, II - 500 ლარი, III - 300 ლარი**.\n\nდეტალური პირობები იხილე თანდართულ დოკუმენტში.",
        clubId: clubIdBySlug.get("moazrovneebi") ?? null,
        media: ["/images/news-wignidan-dackebuli-ambavi.webp"],
        fileUrl: "/uploads/litkonkursi-2026-pirobebi.pdf",
        relatedLinks: [
          {
            label: "კონკურსში შემოსული ტექსტები",
            href: "/stories?tab=works&kind=texts",
          },
        ],
        isFeatured: false,
        publishedAt: new Date("2026-03-29T12:00:00+04:00"),
      },
      {
        type: "news",
        slug: "ane-da-marjani",
        title: "„ანე და მარჯანი“ - შეხვედრა ლიტერატურულ კლუბში",
        body: "წერა - თავისუფლება თუ თავშესაფარი?\n\nლიტერატურული კლუბის შეხვედრას „ანე და მარჯანი“ წარუძღვება მაია მარქარაშვილი.\n\n**23 ივნისი, 18:30**",
        clubId: clubIdBySlug.get("moazrovneebi") ?? null,
        media: ["/images/news-ane-da-marjani.webp"],
        isFeatured: false,
        publishedAt: new Date("2026-06-23T12:00:00+04:00"),
      },
      {
        type: "work_research",
        slug: "kvleva-akhalgazrduli-sivrceebi",
        title: "კვლევა: ახალგაზრდული სივრცეები გლდანში",
        body: "## რას სწავლობდა კვლევა\n\nსივრცის წევრების ჩართულობით ჩატარებული მინი-კვლევა გლდანის ახალგაზრდების საჭიროებებზე.\n\n- რა აკლიათ ახალგაზრდებს უბანში\n- რომელი ფორმატები იზიდავს მათ ყველაზე მეტად\n- როგორ ირჩევენ კლუბებსა და კურსებს",
        clubId: clubIdBySlug.get("liderebi") ?? null,
        fileUrl: null,
        isFeatured: false,
        publishedAt: now,
      },
    ])
    .onConflictDoNothing({ target: contentPosts.slug });
  console.log("  ✓ content_posts (10)");

  /* ლიტკონკურსის გამარჯვებულთა ტექსტები (23-დან 21 — ორი პოსტი ადმინიდანაა
     შეყვანილი და seed-ში არ შედის) */
  await db
    .insert(contentPosts)
    .values(
      LITKONKURSI_2026_WINNERS.map((winner) => ({
        type: "work_text",
        slug: `litkonkursi-2026-${winner.slug}`,
        title: winner.title,
        body: `${winner.body}\n\n> ${LITKONKURSI_2026_FOOTNOTE}`,
        authorName: winner.authorName,
        collectionSlug: "ლიტერატურული კონკურსის გამარჯვებული",
        clubId: clubIdBySlug.get("literaturuli-konkursi") ?? null,
        media: [`/uploads/litkonkursi-${winner.slug}.webp`],
        isFeatured: false,
        publishedAt: new Date("2026-04-23T12:00:00+04:00"),
      })),
    )
    .onConflictDoNothing({ target: contentPosts.slug });
  console.log(`  ✓ ლიტკონკურსის ტექსტები (${LITKONKURSI_2026_WINNERS.length})`);

  /* 2026 წლის სიახლეები (docs/სივრცის სიახლეები.xlsx) */
  await db
    .insert(contentPosts)
    .values(
      NEWS_2026.map((item) => ({
        type: "news",
        slug: item.slug,
        title: item.title,
        body: item.body,
        media: item.media,
        clubId: item.clubSlug
          ? (clubIdBySlug.get(item.clubSlug) ?? null)
          : null,
        relatedLinks: item.relatedLinks ?? null,
        isFeatured: false,
        publishedAt: new Date(item.publishedAt),
      })),
    )
    .onConflictDoNothing({ target: contentPosts.slug });
  console.log(`  ✓ 2026 სიახლეები (${NEWS_2026.length})`);

  /* ჰერო-სლაიდერი — ფიქსირებული UUID-ები idempotent-ობისთვის */
  await db
    .insert(heroSlides)
    .values([
      {
        id: "5eed51de-0001-4000-8000-000000000001",
        sortOrder: 0,
        title: "სივრცე ახალგაზრდების განვითარებისთვის",
        sloganUnder: "გართობა · ურთიერთობა · განვითარება",
        body: "პრაქტიკული გამოცდილება, რეალური ჩართულობა და კრიტიკული აზროვნება - კლუბები, კურსები, შეხვედრები, ღია სამუშაო სივრცე და ღონისძიებები ერთ სივრცეში.",
        image: "/images/hero.webp",
        imageAlt: "„სივრცის“ ცენტრი - ახალგაზრდები შეხვედრაზე",
        cta1Label: "გაიცანი კლუბები",
        cta1Href: "/clubs",
        cta2Label: "ჩვენი ისტორია",
        cta2Href: "/about",
        stats: [],
      },
      {
        id: "5eed51de-0002-4000-8000-000000000002",
        sortOrder: 1,
        eyebrow: "პირველი 100 დღე",
        title: "სივრცის პირველი 100 დღე",
        body: "ბიზნესლაბორატორია, ლიტერატურული კონკურსი, დებატების ჩემპიონატი, შეხვედრები მშობლებთან - ეს მხოლოდ დასაწყისია.",
        image: "/images/hero-100-dghe-awards.webp",
        imageAlt:
          "ლიტერატურული კონკურსის დაჯილდოება - მონაწილეები „სივრცის“ დარბაზში",
        cta1Label: "ვრცლად",
        cta1Href: "/stories/sivrcis-pirveli-100-dghe",
        stats: [
          { value: "226", label: "ახალგაზრდა" },
          { value: "29", label: "მშობელი" },
          { value: "17", label: "პროფესიონალი" },
          { value: "6", label: "ფორმატი" },
        ],
      },
      {
        id: "5eed51de-0003-4000-8000-000000000003",
        sortOrder: 2,
        eyebrow: "კონკურსი",
        title: "ახალგაზრდობა. იდეები. მოქმედება.",
        body: "განახორციელე საკუთარი ინიციატივა სივრცის კლუბებში - აქტივობა, ვორქშოფი ან პროექტი, რომელსაც თავად წარუძღვები. განაცხადები მიიღება 7 სექტემბრის ჩათვლით.",
        image: "/images/news-initsiativebis-konkursi.webp",
        imageAlt: "ახალგაზრდული ინიციატივების კონკურსი - ახალგაზრდები. იდეები. მოქმედება.",
        cta1Label: "გაიგე მეტი",
        cta1Href: "/stories/initsiativebis-konkursi-2026",
        cta2Label: "შეავსე განაცხადი",
        cta2Href: "https://forms.gle/j8TLVUUkuezQke8aA",
        stats: [],
      },
    ])
    .onConflictDoNothing({ target: heroSlides.id });
  console.log("  ✓ hero_slides (3)");

  console.log("✓ seed დასრულდა");
}

main()
  .catch((error) => {
    console.error("✗ seed ჩავარდა:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb(db);
  });
