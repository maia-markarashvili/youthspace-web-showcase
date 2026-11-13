"use client";

import { useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/cn";

/**
 * ტექსტის ველი ფორმატირების პანელით (markdown-ქვესეტი) + „გადახედვა".
 * ღილაკები textarea-ს selection-ის გარშემო სვამენ სინტაქსს setRangeText-ით;
 * მნიშვნელობა ჩვეულებრივი name-იანი textarea-თი იგზავნება ფორმასთან ერთად.
 */

const controlClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-green-mid";

const toolButtonClass =
  "min-h-8 rounded-pill border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-green-mid";

type WrapAction = { kind: "wrap"; before: string; after: string; sample: string };
type LineAction = { kind: "line"; prefix: string; sample: string };
type ToolAction = WrapAction | LineAction;

const EMOJIS = ["🎉","✨","🔥","💚","🚀","💡","🎯","🏆","🎤","🎭","📚","✍️","📸","🎬","🧠","💬","🙌","👏","😊","😎","🤔","⭐","✅","❗"];

const TOOLS: { label: string; title: string; action: ToolAction }[] = [
  { label: "H2", title: "სათაური", action: { kind: "line", prefix: "## ", sample: "სათაური" } },
  { label: "H3", title: "ქვესათაური", action: { kind: "line", prefix: "### ", sample: "ქვესათაური" } },
  { label: "B", title: "მუქი", action: { kind: "wrap", before: "**", after: "**", sample: "მუქი ტექსტი" } },
  { label: "I", title: "დახრილი", action: { kind: "wrap", before: "*", after: "*", sample: "დახრილი ტექსტი" } },
  { label: "• სია", title: "ბულეტების სია", action: { kind: "line", prefix: "- ", sample: "პუნქტი" } },
  { label: "1. სია", title: "ნუმერაციის სია", action: { kind: "line", prefix: "1. ", sample: "პუნქტი" } },
  { label: "ბმული", title: "ბმულის ჩასმა", action: { kind: "wrap", before: "[", after: "](https://)", sample: "ბმულის ტექსტი" } },
  { label: "❝ შენიშვნა", title: "გამორჩეული მინაწერი", action: { kind: "line", prefix: "> ", sample: "შენიშვნა" } },
];

export function MarkdownField({
  label,
  name,
  defaultValue,
  error,
  hint = "ფორმატირება: ## სათაური · **მუქი** · *დახრილი* · - სია · [ბმული](https://…) · > შენიშვნა",
  rows = 10,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  error?: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = name;

  function applyTool(action: ToolAction) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = area.value.slice(start, end);

    if (action.kind === "wrap") {
      const inner = selected || action.sample;
      area.setRangeText(`${action.before}${inner}${action.after}`, start, end, "select");
      /* ბმულზე კურსორი URL-ის ადგილას დადგეს */
      if (action.after.startsWith("](")) {
        const urlStart = start + action.before.length + inner.length + 2;
        area.setSelectionRange(urlStart, urlStart + "https://".length);
      }
    } else {
      /* ხაზის დასაწყისში პრეფიქსი — ყველა მონიშნულ ხაზზე */
      const lineStart = area.value.lastIndexOf("\n", start - 1) + 1;
      const block = area.value.slice(lineStart, end);
      const text = block || action.sample;
      const prefixed = text
        .split("\n")
        .map((line) => (line.startsWith(action.prefix) ? line : `${action.prefix}${line}`))
        .join("\n");
      area.setRangeText(prefixed, lineStart, end, "select");
    }

    area.focus();
    setValue(area.value);
  }

  /* ემოჯის ჩასმა კურსორის ადგილას — პანელი ღია რჩება, რომ რამდენიმე ზედიზედ ჩაისვას */
  function insertEmoji(emoji: string) {
    const area = areaRef.current;
    if (!area) return;
    area.setRangeText(emoji, area.selectionStart, area.selectionEnd, "end");
    area.focus();
    setValue(area.value);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.title}
            onClick={() => applyTool(tool.action)}
            className={toolButtonClass}
          >
            {tool.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEmojiOpen((prev) => !prev)}
          aria-pressed={emojiOpen}
          className={cn(
            toolButtonClass,
            emojiOpen && "border-green-dark bg-green-dark text-white hover:border-green-dark",
          )}
        >
          😊 ემოჯი
        </button>
        <button
          type="button"
          onClick={() => setPreview((prev) => !prev)}
          aria-pressed={preview}
          className={cn(
            toolButtonClass,
            "ml-auto",
            preview && "border-green-dark bg-green-dark text-white hover:border-green-dark",
          )}
        >
          {preview ? "რედაქტირება" : "გადახედვა"}
        </button>
      </div>

      {/* ემოჯის პანელი — გადახედვისას იმალება, რადგან textarea-ც დამალულია */}
      {emojiOpen && !preview ? (
        <div className="flex flex-wrap gap-1 rounded-card border border-line bg-white p-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              aria-label={`ემოჯი ${emoji}`}
              className="min-h-8 min-w-8 rounded-pill px-1.5 text-lg hover:bg-cream"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-card border border-line bg-cream/40 px-4 py-3">
          {value.trim() ? (
            <Markdown body={value} className="gap-4 text-base leading-7" />
          ) : (
            <p className="text-sm text-ink-muted">ტექსტი ცარიელია</p>
          )}
        </div>
      ) : null}

      <textarea
        ref={areaRef}
        id={fieldId}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(controlClass, "min-h-32", preview && "hidden", error && "border-red-600")}
      />

      {hint && !error ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
