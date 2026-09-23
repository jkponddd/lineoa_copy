"use client";

import { useRef } from "react";

// A small, dependency-free syntax-highlighted JSON textarea: a highlighted
// <pre> layer sits behind a transparent-text <textarea> (only its caret is
// visible), kept pixel-aligned by sharing the exact same font/padding and
// synced on scroll — the standard technique behind most lightweight code
// editors, without pulling in a real editor library for one popup.
export function MonokaiJsonEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const preRef = useRef<HTMLPreElement>(null);

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  return (
    <div className="relative h-96 overflow-hidden rounded-md border border-[#75715e]/40" style={{ backgroundColor: "#272822" }}>
      <pre
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 m-0 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word"
        dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        disabled={disabled}
        spellCheck={false}
        className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed wrap-break-word text-transparent caret-white outline-none"
      />
    </div>
  );
}

// Monokai's classic palette. Keys get their own color (distinct from
// string values) even though JSON doesn't distinguish them structurally —
// purely for readability, matching how most JSON-in-Monokai highlighters
// style them.
const TOKEN_PATTERN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlightJson(json: string): string {
  const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(TOKEN_PATTERN, (match, str, isKey, bool, nul, num) => {
    if (str !== undefined) {
      const color = isKey ? "#f92672" : "#e6db74";
      return `<span style="color:${color}">${match}</span>`;
    }
    if (bool !== undefined) return `<span style="color:#66d9ef">${match}</span>`;
    if (nul !== undefined) return `<span style="color:#66d9ef">${match}</span>`;
    if (num !== undefined) return `<span style="color:#ae81ff">${match}</span>`;
    return match;
  });
}
