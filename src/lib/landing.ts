import { siteConfig } from "@/lib/site-config";

/**
 * ლენდინგ-გვერდების per-entity კონტენტი — clubs.landing / courses.landing
 * jsonb სვეტი. წესი: ცარიელი/არარსებული ველი = ავტო-default ამ მოდულის
 * resolve*-ფუნქციებიდან, ამიტომ არსებულ რიგებს backfill არ სჭირდება და
 * ადმინი placeholder-ებში რეალურ ეფექტურ მნიშვნელობებს ხედავს.
 * წმინდა მოდულია — server/client ორივესთვის.
 */

export type LandingFact = { title: string; text: string };
export type LandingProgramItem = { title: string; text: string };
export type LandingFaqItem = { q: string; a: string };

export type LandingContent = {
  /** ჰეროს მოკლე აღწერა (~160 სიმბოლო) */
  heroDescription?: string;
  /** განრიგის ბეიჯი (მაგ. „სამშაბათი · 18:30“) */
  scheduleBadge?: string;
  /** „დარჩა N ადგილი“ ბეიჯის ჩვენება (N ყოველთვის ლაივ მთვლელია) */
  showSeats?: boolean;
  /** ყიდვის ფორმაში სავალდებულო „ასაკი" ველის ჩვენება (default: არა) */
  askAge?: boolean;
  facts?: LandingFact[];
  benefits?: string[];
  /** შესავალი ტექსტი პროგრამის აკორდეონის წინ (markdown: აბზაცები, `- ` სიები).
   *  კლუბის `description` ლენდინგზე 160 სიმბოლოზე იჭრება, ამიტომ გრძელი
   *  შესავალისთვის ეს ველია (კურსების description-ბლოკის ანალოგი). */
  programIntro?: string;
  program?: LandingProgramItem[];
  faq?: LandingFaqItem[];
  ctaLabel?: string;
  ctaMicrocopy?: string;
  /** კურსი: cross-sell ჰინტი ყიდვის ბლოკში */
  crossSell?: string;
  /** კლუბი: „რით სრულდება ციკლი“ ბარათი */
  cycleCard?: string;
  /** კლუბი: მიბმული story (content_posts.id) */
  cycleStoryId?: string;
  /** კურსი: ლექტორის ბლოკი */
  lecturerPhoto?: string;
  lecturerBio?: string;
  meetingsCount?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
};

/* ── შემავალი მინიმალური ფორმები (schema-ს ტიპებზე არ ვართ მიბმული) ── */

type ClubInput = {
  title: string;
  description: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  maxCapacity: number | null;
  finalProduct: string | null;
  landing: LandingContent | null;
};

type CourseInput = {
  title: string;
  description: string | null;
  scheduleText: string | null;
  capacity: number | null;
  lecturer: string | null;
  landing: LandingContent | null;
};

export type ResolvedLanding = Required<
  Pick<
    LandingContent,
    | "heroDescription"
    | "scheduleBadge"
    | "showSeats"
    | "askAge"
    | "facts"
    | "benefits"
    | "program"
    | "faq"
    | "ctaLabel"
    | "ctaMicrocopy"
  >
> &
  Pick<
    LandingContent,
    | "programIntro"
    | "crossSell"
    | "cycleCard"
    | "cycleStoryId"
    | "lecturerPhoto"
    | "lecturerBio"
    | "meetingsCount"
    | "seoTitle"
    | "seoDescription"
    | "seoImage"
  >;

/** ~160 სიმბოლოზე ჭრა სიტყვის საზღვარზე */
export function truncateHero(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trimEnd()}…`;
}

/** ღილაკის ქვეშ; კონკრეტულ კლუბს/კურსს ადმინში თავისი ტექსტი შეუძლია */
const DEFAULT_MICROCOPY =
  "დარეგისტრირდი და ჯავშნებს ჩემი ანგარიშის მენიუში იპოვი";

/** ცარიელი მასივი/სტრიქონი override-ად არ ითვლება */
const pick = <T>(value: T | undefined | null | "", fallback: T): T =>
  value === undefined || value === null || value === ""
    ? fallback
    : (value as T);
const pickList = <T>(value: T[] | undefined, fallback: T[]): T[] =>
  value && value.length > 0 ? value : fallback;

export function resolveClubLanding(
  club: ClubInput,
  /** ფასებზე დამოკიდებული default-ები გვერდიდან მოდის (settings იქ არის) */
  ctx?: { fourPackPriceLabel?: string },
): ResolvedLanding {
  const l = club.landing ?? {};
  const schedule =
    [club.meetingDay, club.meetingTime].filter(Boolean).join(" · ") ||
    "კვირაში ერთი შეხვედრა";

  return {
    heroDescription: pick(
      l.heroDescription,
      truncateHero(club.description ?? ""),
    ),
    scheduleBadge: pick(l.scheduleBadge, schedule),
    showSeats: l.showSeats ?? true,
    askAge: l.askAge ?? false,
    facts: pickList(l.facts, [
      { title: "განრიგი", text: schedule },
      { title: "ხანგრძლივობა", text: "4-თვიანი ციკლი · თვიური გამოწერა" },
      {
        title: "ჯგუფი",
        text: club.maxCapacity
          ? `${club.maxCapacity}-მდე მონაწილე · თვეში ერთი სტუმარი`
          : "მცირე ჯგუფი · თვეში ერთი სტუმარი",
      },
      { title: "მისამართი", text: siteConfig.address },
    ]),
    benefits: pickList(l.benefits, [
      "კვირაში ერთი გარანტირებული კლუბის დღე (14:00–18:00) მენტორთან და გუნდთან",
      `${ctx?.fourPackPriceLabel ? `${ctx.fourPackPriceLabel}-იანი ` : ""}4 შესვლის პაკეტი ფასშივე - დაჯავშნი, როცა გინდა`,
      "შეხვედრები მენტორთან და მოწვეულ სტუმრებთან (+1.5 საათი) - დამატებითი გადასახადის გარეშე",
      "პრაქტიკა და რეალური ჩართულობა - არა ლექციები",
      "ციკლის ბოლოს შენი შედეგი სცენაზე გააქვს",
    ]),
    programIntro: l.programIntro,
    program: pickList(l.program, []),
    /* ⚠ კლუბებს FAQ-სექცია აღარ აქვთ (2026-08-18) — კითხვები ისედაც
       `program`-ის აკორდეონშია. ჩაშენებული default-ები განზრახ მოიხსნა:
       ისინი მაშინაც ჩნდებოდა, როცა ადმინში ცარიელი იყო, და გვერდზე ორი
       კითხვა-პასუხის ბლოკი ჩანდა. ველი ტიპში რჩება - კურსები იყენებენ. */
    faq: pickList(l.faq, []),
    ctaLabel: pick(l.ctaLabel, "გაწევრიანდი ახლავე"),
    ctaMicrocopy: pick(l.ctaMicrocopy, DEFAULT_MICROCOPY),
    cycleCard: pick(l.cycleCard, club.finalProduct ?? ""),
    cycleStoryId: l.cycleStoryId,
    seoTitle: l.seoTitle,
    seoDescription: l.seoDescription,
    seoImage: l.seoImage,
  };
}

export function resolveCourseLanding(
  course: CourseInput,
  /** ფასებზე დამოკიდებული default-ები გვერდიდან მოდის (settings იქ არის);
   *  isFree → ფასდაკლების ხსენება default-ბენეფიტებიდან ქრება */
  ctx?: { defaultCrossSell?: string; isFree?: boolean },
): ResolvedLanding {
  const l = course.landing ?? {};
  const schedule = course.scheduleText ?? "განრიგი დაზუსტდება";

  return {
    heroDescription: pick(
      l.heroDescription,
      truncateHero(course.description ?? ""),
    ),
    scheduleBadge: pick(l.scheduleBadge, schedule),
    showSeats: l.showSeats ?? true,
    askAge: l.askAge ?? false,
    facts: pickList(l.facts, [
      { title: "განრიგი", text: schedule },
      {
        title: "ხანგრძლივობა",
        text: pick(l.meetingsCount, "მოკლე ინტენსიური კურსი"),
      },
      {
        title: "ჯგუფი",
        text: course.capacity
          ? `${course.capacity}-მდე მონაწილე`
          : "მცირე ჯგუფი",
      },
      { title: "მისამართი", text: siteConfig.address },
    ]),
    benefits: pickList(l.benefits, [
      "პრაქტიკული ფორმატი - ცოდნას იმავე კვირაში იყენებ",
      "მცირე ჯგუფი და მეტი ინდივიდუალური ჩართულობა",
      "კურსი კონკრეტული, ხელშესახები შედეგით სრულდება",
      ...(ctx?.isFree
        ? []
        : ["კლუბის წევრებს ფასდაკლება ავტომატურად ერიცხებათ"]),
    ]),
    /* კურსს თავისი description-ბლოკი აქვს, ამიტომ ეს ველი აქ ჩვეულებრივ
       ცარიელია — მაგრამ ტიპში საერთოა, ამიტომ გადაეცემა */
    programIntro: l.programIntro,
    program: pickList(l.program, []),
    faq: pickList(l.faq, [
      {
        q: "გამოცდილება არ მაქვს - გამომივა?",
        a: "კურსი საბაზისო დონიდან იწყება - წინასწარი მომზადება არ გჭირდება.",
      },
      {
        q: "თუ შეხვედრას გავაცდენ?",
        a: "მასალას და დავალებას ჯგუფის არხში მიიღებ - შემდეგ შეხვედრაზე მარტივად დაეწევი.",
      },
      {
        q: "მშობელი ვარ - შვილს ვარეგისტრირებ?",
        a: "კი - ფორმაში მიუთითე შენი ტელეფონი. დადასტურებას და დეტალებს WhatsApp-ზე მიიღებ.",
      },
      {
        q: "სად ვნახო ჩემი ჯავშანი?",
        a: "ანგარიშის გვერდზე - დარეგისტრირდი იმავე ტელეფონით ან ელფოსტით და შენი ჯავშნები იქ გამოჩნდება.",
      },
    ]),
    ctaLabel: pick(l.ctaLabel, "დაიკავე ადგილი ახლავე"),
    ctaMicrocopy: pick(l.ctaMicrocopy, DEFAULT_MICROCOPY),
    crossSell: pick(l.crossSell, ctx?.defaultCrossSell ?? ""),
    lecturerPhoto: l.lecturerPhoto,
    lecturerBio: l.lecturerBio,
    meetingsCount: l.meetingsCount,
    seoTitle: l.seoTitle,
    seoDescription: l.seoDescription,
    seoImage: l.seoImage,
  };
}
