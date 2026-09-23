"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatWidget } from "./chat-widget";

interface Status {
  providers: { id: string; model: string }[];
  store: "mock" | "shopify";
}

/** Demo banner (model switcher, data source, admin link) plus the chat widget. */
export function AssistantShell() {
  const [status, setStatus] = useState<Status | null>(null);
  const [provider, setProvider] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: Status) => {
        if (cancelled) return;
        setStatus(s);
        setProvider((p) => p || s.providers[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-stone-900 px-4 py-2 text-xs text-stone-300">
        <span>
          Demo store · data: <strong className="text-white">{status?.store === "shopify" ? "live Shopify" : "sample orders"}</strong>
        </span>
        {status && status.providers.length > 0 ? (
          <label className="flex items-center gap-1">
            AI:
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded bg-stone-800 px-1 py-0.5 text-white">
              {status.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === "openai" ? "OpenAI" : "Claude"} · {p.model}
                </option>
              ))}
            </select>
          </label>
        ) : status ? (
          <span className="text-amber-300">Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env.local</span>
        ) : null}
        <Link href="/admin" className="underline underline-offset-2 hover:text-white">
          Agent trace &amp; tickets →
        </Link>
      </div>
      <ChatWidget provider={provider} />
    </>
  );
}
