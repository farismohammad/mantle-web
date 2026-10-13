"use client";

import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import { yamlHighlighting } from "./yaml-style";

const extensions = [
  yaml(),
  yamlHighlighting,
  EditorView.lineWrapping,
  EditorView.theme({
    "&": { fontSize: "13px", backgroundColor: "var(--surface-soft)" },
    ".cm-content": { fontFamily: "var(--mono)", padding: "20px 0" },
    ".cm-gutters": {
      backgroundColor: "var(--surface-soft)",
      color: "var(--muted-soft)",
      border: "none",
    },
    ".cm-scroller": { overflow: "auto", fontFamily: "var(--mono)" },
    ".cm-line": { padding: "0 20px" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--selection)",
    },
  }, { dark: true }),
];
export default function YamlHighlight({ text }: { text: string }) {
  return (
    <CodeMirror
      value={text}
      extensions={extensions}
      theme="none"
      editable={false}
      readOnly
      aria-label="Read-only agent.yaml"
      maxHeight="640px"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
    />
  );
}
