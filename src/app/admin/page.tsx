"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReturnRequest, Ticket, TraceEntry } from "@/lib/ops";

interface Ops {
  trace: TraceEntry[];
  tickets: Ticket[];
  returns: ReturnRequest[];
}

export default function AdminPage() {
  const [ops, setOps] = useState<Ops>({ trace: [], tickets: [], returns: [] });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/ops")
        .then((r) => r.json())
        .then((d: Ops) => !cancelled && setOps(d));
    load();
    const t = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <Link href="/" className="text-sm text-emerald-800 hover:underline">
          ← Back to store
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Agent operations</h1>
        <p className="mt-1 text-sm text-stone-500">Every tool call the assistant makes, plus the tickets and returns it created. Refreshes every 3 seconds.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Panel title={`Human handoffs (${ops.tickets.length})`}>
            {ops.tickets.length === 0 && <Empty>No handoffs yet.</Empty>}
            {ops.tickets.map((t) => (
              <div key={t.id} className="border-t border-stone-100 py-3 first:border-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold">{t.id}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${t.priority === "high" ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>{t.priority}</span>
                  <span className="text-stone-400">{new Date(t.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-sm">{t.summary}</p>
                {t.customerEmail && <p className="mt-0.5 text-xs text-stone-500">{t.customerEmail}</p>}
              </div>
            ))}
          </Panel>
          <Panel title={`Return requests (${ops.returns.length})`}>
            {ops.returns.length === 0 && <Empty>No returns yet.</Empty>}
            {ops.returns.map((r) => (
              <div key={r.id} className="border-t border-stone-100 py-3 text-sm first:border-0">
                <p>
                  <span className="font-mono font-semibold">{r.id}</span> · order #{r.orderNumber} · {r.items.join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">Reason: {r.reason}</p>
              </div>
            ))}
          </Panel>
        </div>

        <Panel title={`Tool-call trace (${ops.trace.length})`} className="mt-4">
          {ops.trace.length === 0 && <Empty>Chat with the assistant on the store page to see its tool calls here.</Empty>}
          <div className="divide-y divide-stone-100">
            {ops.trace.map((e) => (
              <div key={e.id} className="py-2">
                <button onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-center gap-3 text-left text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${e.ok ? "bg-emerald-600" : "bg-red-600"}`} />
                  <span className="font-mono font-semibold">{e.tool}</span>
                  <span className="truncate text-stone-500">{JSON.stringify(e.input)}</span>
                  <span className="ml-auto shrink-0 text-xs text-stone-400 tabular-nums">
                    {e.ms} ms · {new Date(e.at).toLocaleTimeString()}
                  </span>
                </button>
                {open === e.id && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-stone-100">
                    {JSON.stringify({ conversation: e.conversationId, input: e.input, output: e.output }, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-4 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-stone-400">{children}</p>;
}
