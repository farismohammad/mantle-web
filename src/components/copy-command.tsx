"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  text,
  label = "Copy command",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <span className="copy-control">
      <button
        type="button"
        className="copy-button"
        onClick={copy}
        aria-label={status === "copied" ? "Copied" : label}
        title={label}
      >
        {status === "copied" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <span
        className={status === "failed" ? "copy-failure" : "sr-only"}
        role="status"
      >
        {status === "copied"
          ? "Copied to clipboard"
          : status === "failed"
            ? "Select and copy the text manually."
            : ""}
      </span>
    </span>
  );
}

export function Command({ children }: { children: string }) {
  return (
    <div className="command">
      <span aria-hidden="true" className="prompt">
        $
      </span>
      <code>{children}</code>
      <CopyButton text={children} />
    </div>
  );
}
