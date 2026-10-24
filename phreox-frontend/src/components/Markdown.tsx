import { Fragment, type ReactNode, useState } from "react";
import { Emoji } from "./Emoji.tsx";

type InlineRule = {
  regex: RegExp;
  render: (match: RegExpExecArray) => ReactNode;
};

const linkClass = "text-[#5aa9e6] hover:underline break-all";

// Earlier rules win when two matches start at the same index,
// so "__" (underline) is listed before "_" (italic).
const inlineRules: InlineRule[] = [
  {
    regex: /`([^`\n]+)`/,
    render: (match) => (
      <code className="px-1 py-0.5 text-sm bg-(--background-dark) rounded">
        {match[1]}
      </code>
    ),
  },
  {
    regex: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/,
    render: (match) => (
      <a href={match[2]} target="_blank" rel="noreferrer" className={linkClass}>
        {parseInline(match[1])}
      </a>
    ),
  },
  {
    regex: /https?:\/\/[^\s<]+/,
    render: (match) => (
      <a href={match[0]} target="_blank" rel="noreferrer" className={linkClass}>
        {match[0]}
      </a>
    ),
  },
  {
    regex: /\|\|([^\n]+?)\|\|/,
    render: (match) => <Spoiler>{parseInline(match[1])}</Spoiler>,
  },
  {
    regex: /__([^\n]+?)__/,
    render: (match) => <u>{parseInline(match[1])}</u>,
  },
  {
    regex: /\*\*\*([^\n]+?)\*\*\*/,
    render: (match) => (
      <strong>
        <em>{parseInline(match[1])}</em>
      </strong>
    ),
  },
  {
    regex: /\*\*([^\n]+?)\*\*/,
    render: (match) => <strong>{parseInline(match[1])}</strong>,
  },
  {
    regex: /\*([^\s*][^\n*]*?)\*/,
    render: (match) => <em>{parseInline(match[1])}</em>,
  },
  {
    regex: /(?<![\p{L}\p{N}])_([^\s_][^\n_]*?)_(?![\p{L}\p{N}])/u,
    render: (match) => <em>{parseInline(match[1])}</em>,
  },
  {
    regex: /~~([^\n]+?)~~/,
    render: (match) => <s>{parseInline(match[1])}</s>,
  },
  {
    regex: /@([\p{L}\p{N}_.-]{1,32})/u,
    render: (match) => (
      <span className="px-1 rounded bg-(--background-panel) text-(--text-default)">
        @{match[1]}
      </span>
    ),
  },
  {
    regex: /\p{Extended_Pictographic}(?:️|⃣)?(?:‍\p{Extended_Pictographic}(?:️)?)*/u,
    render: (match) => <Emoji emoji={match[0]} />,
  },
];

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;

  while (rest.length > 0) {
    let best: { index: number; match: RegExpExecArray; rule: InlineRule } | undefined;

    for (const rule of inlineRules) {
      const match = rule.regex.exec(rest);

      if (match && (!best || match.index < best.index)) {
        best = { index: match.index, match, rule };
      }
    }

    if (!best) {
      nodes.push(rest);
      break;
    }

    if (best.index > 0) nodes.push(rest.slice(0, best.index));

    nodes.push(best.rule.render(best.match));
    rest = rest.slice(best.index + best.match[0].length);
  }

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}

const listItemRegex = /^(\s*)([-*]|\d+\.) (.*)$/;
const quoteRegex = /^>( |$)/;

function isBlockStart(line: string) {
  return line.startsWith("```") ||
    /^#{1,3} /.test(line) ||
    line.startsWith("-# ") ||
    quoteRegex.test(line) ||
    listItemRegex.test(line);
}

function parseBlocks(source: string): ReactNode[] {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }

      i++;
      blocks.push(
        <pre
          key={blocks.length}
          className="p-2 text-sm overflow-x-auto bg-(--background-dark) border border-(--border-panel) rounded-md"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith(">>> ")) {
      const quoted = [line.slice(4), ...lines.slice(i + 1)].join("\n");

      blocks.push(<Quote key={blocks.length}>{parseBlocks(quoted)}</Quote>);
      break;
    }

    if (quoteRegex.test(line)) {
      const quoted: string[] = [];

      while (i < lines.length && quoteRegex.test(lines[i])) {
        quoted.push(lines[i].replace(/^> ?/, ""));
        i++;
      }

      blocks.push(<Quote key={blocks.length}>{parseBlocks(quoted.join("\n"))}</Quote>);
      continue;
    }

    const heading = /^(#{1,3}) (.*)$/.exec(line);

    if (heading) {
      const level = heading[1].length;
      const HeadingTag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const className = level === 1
        ? "text-2xl font-bold"
        : level === 2
        ? "text-xl font-semibold"
        : "text-lg font-semibold";

      blocks.push(
        <HeadingTag key={blocks.length} className={className}>
          {parseInline(heading[2])}
        </HeadingTag>,
      );
      i++;
      continue;
    }

    const subtext = /^-# (.*)$/.exec(line);

    if (subtext) {
      blocks.push(
        <p key={blocks.length} className="text-xs text-(--text-dark)">
          {parseInline(subtext[1])}
        </p>,
      );
      i++;
      continue;
    }

    if (listItemRegex.test(line)) {
      const items: RegExpExecArray[] = [];

      while (i < lines.length) {
        const item = listItemRegex.exec(lines[i]);

        if (!item) break;

        items.push(item);
        i++;
      }

      blocks.push(
        <ul key={blocks.length} className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-2"
              style={{ marginLeft: `${Math.floor(item[1].length / 2) * 1.25}rem` }}
            >
              <span className="shrink-0">
                {/^\d/.test(item[2]) ? item[2] : "•"}
              </span>

              <span>{parseInline(item[3])}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraph: string[] = [];

    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }

    blocks.push(
      <p key={blocks.length}>
        {paragraph.map((text, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {parseInline(text)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return blocks;
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="pl-3 flex flex-col gap-1 border-l-4 border-(--border-panel) text-(--text-washed)">
      {children}
    </blockquote>
  );
}

function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      className={`px-0.5 rounded cursor-pointer transition-colors duration-200 ease-in-out ${
        revealed
          ? "bg-(--background-panel)"
          : "bg-(--text-dark) text-transparent select-none"
      }`}
      onClick={() => setRevealed(true)}
    >
      {children}
    </span>
  );
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="min-w-0 flex flex-col gap-1 break-words">
      {parseBlocks(source)}
    </div>
  );
}
