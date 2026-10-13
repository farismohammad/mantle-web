"use client";

import dynamic from "next/dynamic";
import { revisionLabel } from "@/domain/presentation";
import { yaml as yamlLanguage } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import { yamlHighlighting } from "./yaml-style";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Braces,
  Check,
  Clock3,
  FilePlus2,
  History,
  PanelLeftClose,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  formatAgentYaml,
  validateAgentYaml,
  type ValidationIssue,
} from "@/domain/validation";
import type {
  AgentSummary,
  RevisionInfo,
  StoredAgent,
} from "@/server/repository";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="editor-loading">Opening agent.yaml…</div>,
});

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--canvas)",
    color: "var(--ink)",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "var(--ink)",
    fontFamily: "var(--mono)",
    fontSize: "13px",
    padding: "22px 0 40vh",
  },
  ".cm-gutters": {
    backgroundColor: "var(--canvas)",
    color: "var(--muted-soft)",
    border: "none",
    paddingLeft: "8px",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--surface-soft)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection)",
  },
  "&.cm-focused": { outline: "none" },
}, { dark: true });

const NEW_AGENT_YAML = `mantle: "0.1"
agent:
  name: new-agent
  description: A focused personal agent
runtime:
  name: pi
  version: latest
model:
  provider: openai
  name: gpt-5.6
resources:
  skills: []
  packages: []
permissions:
  filesystem: all
  shell: all
secrets: []
`;

interface ApiEnvelope<T> {
  data: T;
}
interface ApiFailure {
  error?: { message?: string; details?: { issues?: ValidationIssue[] } };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiFailure;
    const issues = body.error?.details?.issues;
    const detail = issues?.length
      ? ` ${issues.map((issue) => `${issue.path ?? "YAML"}: ${issue.message}`).join("; ")}`
      : "";
    throw new Error(`${body.error?.message ?? "Request failed."}${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return ((await response.json()) as ApiEnvelope<T>).data;
}

export function AgentRepository({
  initialAgents,
  initialAgent,
  initialRevisions,
}: {
  initialAgents: AgentSummary[];
  initialAgent: StoredAgent | null;
  initialRevisions: RevisionInfo[];
}) {
  const [agents, setAgents] = useState(initialAgents);
  const [selected, setSelected] = useState(initialAgent?.name ?? null);
  const [yamlText, setYamlText] = useState(
    initialAgent?.yaml ?? NEW_AGENT_YAML,
  );
  const [savedText, setSavedText] = useState(
    initialAgent?.yaml ?? NEW_AGENT_YAML,
  );
  const [latestRevision, setLatestRevision] = useState(
    initialAgent?.revision.number ?? null,
  );
  const [viewingRevision, setViewingRevision] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<RevisionInfo[]>(initialRevisions);
  const [showHistory, setShowHistory] = useState(true);
  const [notice, setNotice] = useState(
    initialAgent ? "Ready" : "Create your first agent",
  );
  const [isPending, startTransition] = useTransition();
  const validation = useMemo(
    () => validateAgentYaml(yamlText, selected ?? undefined),
    [yamlText, selected],
  );
  const isNew = selected === null;
  const dirty = yamlText !== savedText;
  const readOnly = viewingRevision !== null;

  const refreshAgents = useCallback(async () => {
    setAgents(await api<AgentSummary[]>("/api/agents"));
  }, []);

  const loadAgent = useCallback((name: string) => {
    startTransition(async () => {
      try {
        const [agent, history] = await Promise.all([
          api<StoredAgent>(`/api/agents/${name}`),
          api<RevisionInfo[]>(`/api/agents/${name}/revisions`),
        ]);
        setSelected(name);
        setYamlText(agent.yaml);
        setSavedText(agent.yaml);
        setLatestRevision(agent.revision.number);
        setViewingRevision(null);
        setRevisions(history);
        setNotice("Latest revision loaded");
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Could not load agent.",
        );
      }
    });
  }, []);

  function canNavigate() {
    if (dirty && !readOnly) {
      setNotice(
        "Save or discard your changes before switching configurations.",
      );
      return false;
    }
    return true;
  }

  function createAgent() {
    setSelected(null);
    setYamlText(NEW_AGENT_YAML);
    setSavedText(NEW_AGENT_YAML);
    setLatestRevision(null);
    setViewingRevision(null);
    setRevisions([]);
    setNotice("New unsaved agent");
  }

  function save() {
    if (!validation.valid || readOnly) return;
    const name = validation.config.agent.name;
    if (isNew && agents.some((agent) => agent.name === name)) {
      setNotice(`Agent “${name}” already exists. Select it before editing.`);
      return;
    }
    startTransition(async () => {
      try {
        const result = await api<{ created: boolean; revision: RevisionInfo }>(
          `/api/agents/${name}`,
          {
            method: "PUT",
            headers: { "content-type": "application/yaml; charset=utf-8" },
            body: yamlText,
          },
        );
        setSelected(name);
        setSavedText(yamlText);
        setLatestRevision(result.revision.number);
        setViewingRevision(null);
        setRevisions(
          await api<RevisionInfo[]>(`/api/agents/${name}/revisions`),
        );
        await refreshAgents();
        setNotice(
          result.created
            ? `${revisionLabel(result.revision.number)} saved`
            : "No changes — revision unchanged",
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Save failed.");
      }
    });
  }

  function viewRevision(number: number) {
    if (!selected) return;
    startTransition(async () => {
      try {
        const agent = await api<StoredAgent>(
          `/api/agents/${selected}/revisions/${number}`,
        );
        setYamlText(agent.yaml);
        setViewingRevision(number);
        setNotice(`Viewing immutable ${revisionLabel(number)}`);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Could not load revision.",
        );
      }
    });
  }

  function returnToLatest() {
    if (selected) loadAgent(selected);
  }

  function removeAgent() {
    if (
      !selected ||
      !window.confirm(`Delete “${selected}” and every Cloud revision?`)
    )
      return;
    startTransition(async () => {
      try {
        await api<void>(`/api/agents/${selected}`, { method: "DELETE" });
        const remaining = agents.filter((agent) => agent.name !== selected);
        setAgents(remaining);
        if (remaining[0]) loadAgent(remaining[0].name);
        else createAgent();
        setNotice("Agent and its Cloud revisions deleted");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Delete failed.");
      }
    });
  }

  function formatYaml() {
    if (!validation.valid || readOnly) return;
    setYamlText(formatAgentYaml(yamlText));
    setNotice("YAML formatted");
  }

  const title = validation.valid
    ? validation.config.agent.name
    : (selected ?? "Invalid configuration");

  return (
    <main
      className={`repository-shell ${showHistory ? "with-history" : ""}`}
      id="workspace"
    >
      <aside className="agent-rail">
        <div className="rail-heading">
          <span>Agents</span>
          <b>{agents.length}</b>
        </div>
        <button
          className="new-agent"
          type="button"
          disabled={isPending}
          onClick={() => {
            if (canNavigate()) createAgent();
          }}
        >
          <FilePlus2 /> New config
        </button>
        <nav aria-label="Stored agents">
          {agents.map((agent) => (
            <button
              className={selected === agent.name ? "active" : ""}
              key={agent.name}
              type="button"
              disabled={isPending}
              onClick={() => {
                if (canNavigate()) loadAgent(agent.name);
              }}
            >
              <span className="agent-initial">{agent.name[0]}</span>
              <span>
                <strong>{agent.name}</strong>
                <small>
                  {revisionLabel(agent.revision)} ·{" "}
                  {agent.description || "No description"}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <code>MANTLE_DATA_DIR</code>
          <span>filesystem backed</span>
        </div>
      </aside>

      <section className="editor-workspace">
        <header className="editor-heading">
          <div>
            <span className="breadcrumb">agents /</span>
            <h1>{title}</h1>
            {readOnly ? (
              <em>immutable {revisionLabel(viewingRevision)}</em>
            ) : dirty ? (
              <em>modified</em>
            ) : null}
          </div>
          <div className="editor-actions">
            {dirty && !readOnly ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setYamlText(savedText);
                  setNotice("Unsaved changes discarded");
                }}
              >
                <RotateCcw /> Discard
              </button>
            ) : null}
            {readOnly ? (
              <button type="button" onClick={returnToLatest}>
                <RotateCcw /> Latest
              </button>
            ) : null}
            <button
              type="button"
              onClick={formatYaml}
              disabled={!validation.valid || readOnly || isPending}
            >
              <Braces /> Format
            </button>
            <button
              type="button"
              className="save-action"
              onClick={save}
              disabled={!validation.valid || readOnly || isPending}
            >
              <Save /> {isPending ? "Working…" : "Save"}
            </button>
            <button
              type="button"
              className="icon-action"
              aria-label={showHistory ? "Hide history" : "Show history"}
              onClick={() => setShowHistory((value) => !value)}
            >
              <PanelLeftClose />
            </button>
          </div>
        </header>
        <div className="file-tab">
          <span />
          agent.yaml{" "}
          <small>
            {latestRevision
              ? `latest ${revisionLabel(latestRevision)}`
              : "not stored"}
          </small>
        </div>
        <div className="yaml-editor">
          <CodeMirror
            theme="none"
            value={yamlText}
            readOnly={readOnly || isPending}
            extensions={[yamlLanguage(), yamlHighlighting, editorTheme]}
            onChange={setYamlText}
            basicSetup={{ foldGutter: false, highlightActiveLineGutter: true }}
          />
        </div>
        <footer
          className={`validation-bar ${validation.valid ? "valid" : "invalid"}`}
        >
          <div>
            {validation.valid ? (
              <Check />
            ) : (
              <span className="error-mark">!</span>
            )}
            <strong>
              {validation.valid
                ? "Valid Mantle 0.1 configuration"
                : `${validation.issues.length} validation issue${validation.issues.length === 1 ? "" : "s"}`}
            </strong>
          </div>
          {!validation.valid ? (
            <ul>
              {validation.issues.slice(0, 3).map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  {issue.path ? `${issue.path}: ` : ""}
                  {issue.message}
                  {issue.line ? ` (line ${issue.line})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <span className="notice" role="status">
            {notice}
          </span>
        </footer>
      </section>

      {showHistory ? (
        <aside className="history-rail">
          <div className="history-heading">
            <History />
            <div>
              <h2>Revisions</h2>
              <p>Immutable Cloud history</p>
            </div>
          </div>
          {isNew ? (
            <div className="history-empty">
              <Clock3 />
              <p>History begins when this configuration is saved.</p>
            </div>
          ) : (
            <div className="revision-list">
              {revisions.map((revision, index) => (
                <button
                  className={
                    viewingRevision === revision.number ||
                    (!viewingRevision && index === 0)
                      ? "active"
                      : ""
                  }
                  type="button"
                  key={revision.number}
                  disabled={isPending}
                  onClick={() => {
                    if (canNavigate()) viewRevision(revision.number);
                  }}
                >
                  <span className="revision-track">
                    <i />
                  </span>
                  <span>
                    <strong>
                      {revisionLabel(revision.number)}{" "}
                      {index === 0 ? <em>latest</em> : null}
                    </strong>
                    <small>
                      {new Date(revision.createdAt).toLocaleString()}
                    </small>
                    <code>{revision.sha256.slice(0, 9)}</code>
                  </span>
                </button>
              ))}
            </div>
          )}
          {!isNew ? (
            <button
              className="delete-agent"
              type="button"
              onClick={removeAgent}
              disabled={isPending}
            >
              <Trash2 /> Delete agent
            </button>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}
