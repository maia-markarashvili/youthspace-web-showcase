/**
 * მინიმალური markdown-ქვესეტის პარსერი კონტენტის ტექსტებისთვის — გარე
 * დამოკიდებულების გარეშე. მხარდაჭერილი სინტაქსი:
 *
 *   ## სათაური / ### ქვესათაური
 *   - ბულეტი        1. ნუმერაცია
 *   **მუქი**  *დახრილი*  [ბმული](https://…)
 *   > შენიშვნა — ვიზუალურად გამორჩეული მინაწერი (პატარა, მიღწერილი)
 *   ცარიელი ხაზი = ახალი აბზაცი
 *   ერთი Enter = ახალი ხაზი იმავე აბზაცში (ჩვეულებრივი markdown ხაზებს
 *   აწებებდა; ადმინი ტექსტს ისე ხედავს, როგორც ჩაწერა — მაგ. ✅-ჩამონათვალი)
 *
 * გამოტანა React-ელემენტებით ხდება (src/components/markdown.tsx) —
 * dangerouslySetInnerHTML არსად გამოიყენება, ამიტომ HTML-injection შეუძლებელია.
 */

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "break" }
  | { kind: "strong"; children: InlineNode[] }
  | { kind: "em"; children: InlineNode[] }
  | { kind: "link"; href: string; children: InlineNode[] };

export type BlockNode =
  | { kind: "heading"; level: 2 | 3; children: InlineNode[] }
  | { kind: "paragraph"; children: InlineNode[] }
  | { kind: "list"; ordered: boolean; items: InlineNode[][] }
  | { kind: "note"; children: InlineNode[] };

/** დაშვებული ბმულები — javascript: და მსგავსი სქემები plain-ტექსტად რჩება */
function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|\/|mailto:)/i.test(href);
}

/* inline: ჯერ ბმულები, მერე **მუქი**, მერე *დახრილი* */
const INLINE_RE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*|\*([^*]+)\*/;

/** ტექსტში \n → ხაზის გადატანის კვანძები (აბზაცის შიგნით) */
function pushText(nodes: InlineNode[], text: string) {
  const parts = text.split("\n");
  parts.forEach((part, index) => {
    if (index > 0) nodes.push({ kind: "break" });
    if (part !== "") nodes.push({ kind: "text", text: part });
  });
}

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = INLINE_RE.exec(rest);
    if (!match) {
      pushText(nodes, rest);
      break;
    }
    if (match.index > 0) {
      pushText(nodes, rest.slice(0, match.index));
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      /* [ტექსტი](url) */
      if (isSafeHref(match[2])) {
        nodes.push({
          kind: "link",
          href: match[2],
          children: parseInline(match[1]),
        });
      } else {
        nodes.push({ kind: "text", text: match[0] });
      }
    } else if (match[3] !== undefined) {
      nodes.push({ kind: "strong", children: parseInline(match[3]) });
    } else if (match[4] !== undefined) {
      nodes.push({ kind: "em", children: parseInline(match[4]) });
    }
    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

export function parseMarkdown(body: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  /* მიმდინარე აბზაცის ხაზები — ცარიელი ხაზი ან სხვა ბლოკი ხურავს */
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    /* ხაზები \n-ით იკვრება (და არა ჰარით) — ერთი Enter ტექსტში ხაზის
       გადატანად რჩება, როგორც ადმინის ველში ჩაწერეს */
    blocks.push({
      kind: "paragraph",
      children: parseInline(paragraph.join("\n")),
    });
    paragraph = [];
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      continue;
    }

    const heading = /^(##+)\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: heading[1].length >= 3 ? 3 : 2,
        children: parseInline(heading[2]),
      });
      continue;
    }

    const note = /^>\s+(.*)$/.exec(line);
    if (note) {
      flushParagraph();
      const last = blocks.at(-1);
      /* მიმდევრობითი „> " ხაზები ერთ შენიშვნად იკვრება (სიების ანალოგიით) */
      if (last?.kind === "note") {
        last.children.push({ kind: "text", text: " " }, ...parseInline(note[1]));
      } else {
        blocks.push({ kind: "note", children: parseInline(note[1]) });
      }
      continue;
    }

    const bullet = /^[-•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const itemText = (bullet ?? numbered)![1];
      const last = blocks.at(-1);
      /* მიმდევრობითი ერთნაირი პუნქტები ერთ სიად იკვრება */
      if (last?.kind === "list" && last.ordered === ordered) {
        last.items.push(parseInline(itemText));
      } else {
        blocks.push({ kind: "list", ordered, items: [parseInline(itemText)] });
      }
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/* ── plain-ტექსტი excerpt-ებისთვის (ბარათები, meta description) ── */

function inlineToPlain(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === "text") return node.text;
      /* ხაზის გადატანა plain-ტექსტში ჰარით იცვლება (SEO description, ბარათები) */
      if (node.kind === "break") return " ";
      return inlineToPlain(node.children);
    })
    .join("");
}

export function markdownToPlain(body: string): string {
  return parseMarkdown(body)
    /* შენიშვნები excerpt-ებში/OG-ში არ გვინდა — სერვისული მინაწერია */
    .filter((block) => block.kind !== "note")
    .map((block) =>
      block.kind === "list"
        ? block.items.map(inlineToPlain).join(" · ")
        : inlineToPlain(block.children),
    )
    .join(" ")
    .trim();
}

/** მოკლე აღწერა სიტყვის საზღვარზე მოჭრით — ბარათებსა და SEO description-ში */
export function markdownExcerpt(body: string, max = 160): string {
  const plain = markdownToPlain(body);
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}
