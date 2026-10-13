import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Near-monochrome YAML colors shared by the viewer and the editor: ink keys,
// green strings, muted comments and punctuation. Values are tokens in
// globals.css.
export const yamlHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.propertyName, color: "var(--yaml-key)", fontWeight: "500" },
    { tag: tags.string, color: "var(--yaml-string)" },
    { tag: [tags.number, tags.bool, tags.null], color: "var(--yaml-literal)" },
    { tag: tags.content, color: "var(--yaml-text)" },
    { tag: tags.comment, color: "var(--yaml-comment)", fontStyle: "italic" },
    { tag: [tags.punctuation, tags.separator], color: "var(--yaml-comment)" },
    { tag: tags.meta, color: "var(--yaml-comment)" },
  ]),
);
