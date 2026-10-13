"use client";

import dynamic from "next/dynamic";
import { CopyButton } from "./copy-command";

const HighlightedYaml = dynamic(() => import("./yaml-highlight"), {
  ssr: false,
  loading: () => (
    <p className="editor-loading" role="status">
      Loading syntax highlighting…
    </p>
  ),
});
export function YamlView({
  text,
  revision,
}: {
  text: string;
  revision: string;
}) {
  return (
    <section className="yaml-panel" aria-label="Agent YAML configuration">
      <header>
        <span>
          <span className="yaml-dot" /> agent.yaml
        </span>
        <span>
          {revision} <CopyButton text={text} label="Copy YAML" />
        </span>
      </header>
      <HighlightedYaml text={text} />
    </section>
  );
}
