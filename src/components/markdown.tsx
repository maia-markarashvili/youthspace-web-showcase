import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { parseMarkdown, type InlineNode } from "@/lib/markdown";

/**
 * Markdown-ქვესეტის რენდერერი — pure კომპონენტი (არც async, არც "use client"),
 * რომ სერვერის გვერდებმაც და ადმინის „გადახედვამაც" გამოიყენონ.
 * ყველაფერი React-ელემენტებით იხატება — dangerouslySetInnerHTML არ არსებობს.
 */

function renderInline(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.kind) {
      case "text":
        return node.text;
      case "break":
        return <br key={index} />;
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "link": {
        const external = /^https?:\/\//.test(node.href);
        return (
          <a
            key={index}
            href={node.href}
            className="font-semibold text-green-dark underline"
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {renderInline(node.children)}
          </a>
        );
      }
    }
  });
}

export function Markdown({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const blocks = parseMarkdown(body);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-5 leading-8 text-ink", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={index} className="mt-3 text-h2 font-bold text-green-dark">
                {renderInline(block.children)}
              </h2>
            ) : (
              <h3 key={index} className="mt-2 text-h3 font-bold text-green-dark">
                {renderInline(block.children)}
              </h3>
            );
          case "list":
            return block.ordered ? (
              <ol key={index} className="flex list-decimal flex-col gap-2 pl-6">
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="flex list-disc flex-col gap-2 pl-6">
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "note":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-green-mid pl-4 text-sm italic leading-6 text-ink-muted"
              >
                {renderInline(block.children)}
              </blockquote>
            );
          case "paragraph":
            return <p key={index}>{renderInline(block.children)}</p>;
        }
      })}
    </div>
  );
}
