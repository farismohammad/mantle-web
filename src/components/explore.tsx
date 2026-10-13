"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Box, Search, Terminal, Layers } from "lucide-react";
import type { AgentSummary } from "@/server/repository";
import { dateLabel, revisionLabel } from "@/domain/presentation";
import { Command } from "./copy-command";

export function Explore({ agents }: { agents: AgentSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const filtered = agents
    .filter((agent) =>
      `${agent.name} ${agent.description} ${agent.runtime.name}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.localeCompare(a.updatedAt) ||
          a.name.localeCompare(b.name),
    );
  return (
    <section className="explore-section" aria-labelledby="agents-heading">
      <div className="section-heading">
        <div>
          <h2 id="agents-heading">
            Available agents <span className="count">{filtered.length}</span>
          </h2>
          <p>Search by name, description, or runtime.</p>
        </div>
        <span className="text-label">latest registry revisions</span>
      </div>
      {agents.length > 0 ? (
        <div className="browse-tools">
          <label className="search">
            <Search size={18} />
            <span className="sr-only">Search agents</span>
            <input
              type="search"
              placeholder="Search agents by name or description…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="sort">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="updated">Recently updated</option>
              <option value="name">Name, A–Z</option>
            </select>
          </label>
        </div>
      ) : null}
      <p className="sr-only" role="status">
        {filtered.length} agents found
      </p>
      {filtered.length ? (
        <div className="agent-grid">
          {filtered.map((agent) => (
            <Link
              className="agent-card"
              key={agent.name}
              href={`/agents/${agent.name}`}
            >
              <div className="card-top">
                <span className="agent-icon">
                  <Terminal size={20} />
                </span>
                <span className="revision-tag">
                  {revisionLabel(agent.revision)}
                </span>
                <ArrowUpRight className="card-arrow" size={18} />
              </div>
              <h3>{agent.name}</h3>
              <p className="agent-description">
                {agent.description ||
                  "No description yet. Open this agent to inspect its configuration."}
              </p>
              <div className="card-meta">
                <span>
                  <Terminal size={13} />
                  {agent.runtime.name} <code>{agent.runtime.version}</code>
                </span>
                <span>
                  <Layers size={13} />
                  {agent.skillCount}{" "}
                  {agent.skillCount === 1 ? "skill" : "skills"}
                </span>
                <span>
                  <Box size={13} />
                  {agent.packageCount}{" "}
                  {agent.packageCount === 1 ? "package" : "packages"}
                </span>
              </div>
              <div className="card-bottom">
                <span>
                  Updated{" "}
                  <time dateTime={agent.updatedAt}>
                    {dateLabel(agent.updatedAt)}
                  </time>
                </span>
                <span>
                  View agent <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Terminal aria-hidden="true" />
          <h3>
            {agents.length
              ? "No agents match your search"
              : "No agents in this registry"}
          </h3>
          <p>
            {agents.length
              ? "Try a different name or a shorter search."
              : "Create an agent locally, then push its YAML configuration to this instance."}
          </p>
          {agents.length ? (
            <button className="button" onClick={() => setQuery("")}>
              Clear search
            </button>
          ) : (
            <>
              <Command>mantle agent create my-agent</Command>
              <Command>mantle cloud push my-agent</Command>
            </>
          )}
        </div>
      )}
    </section>
  );
}
