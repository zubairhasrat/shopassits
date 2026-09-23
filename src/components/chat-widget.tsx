"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShopMessage } from "@/lib/tools";

const STARTERS = [
  "Where's my order #1002? Email: leo@example.com",
  "I need waterproof hiking boots under $250",
  "I want to return the boots from order 1003, they're too small. Email sam@example.com",
  "Do you ship to Canada?",
];

type Part = ShopMessage["parts"][number];

export function ChatWidget({ provider }: { provider?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId] = useState(() => crypto.randomUUID());
  const bottom = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport<ShopMessage>({ api: "/api/chat", body: { conversationId } }),
    [conversationId],
  );
  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat<ShopMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() }, { body: { provider } });
    setInput("");
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-5 bottom-5 z-40 flex h-14 items-center gap-2 rounded-full bg-emerald-800 px-5 text-sm font-semibold text-white shadow-xl shadow-emerald-900/30 hover:bg-emerald-700"
        aria-expanded={open}
      >
        {open ? "Close" : "Chat with us"}
      </button>

      {open && (
        <section
          className="fixed right-5 bottom-24 z-40 flex h-[min(640px,calc(100dvh-8rem))] w-[min(410px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
          aria-label="Support chat"
        >
          <header className="flex items-center gap-3 bg-emerald-900 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">⛰️</div>
            <div>
              <p className="text-sm font-semibold">Northpeak Support</p>
              <p className="text-xs text-emerald-100">AI assistant · a human can take over anytime</p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4 text-sm">
            <Bubble role="assistant">
              Hi! I can track orders, recommend gear, explain our policies and start returns. What can I help with?
            </Bubble>
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-[13px] text-stone-700 hover:border-emerald-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) =>
              m.parts.map((part, i) => (
                <PartView
                  key={`${m.id}-${i}`}
                  role={m.role}
                  part={part}
                  onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
                />
              )),
            )}

            {status === "submitted" && <p className="text-xs text-stone-400">Typing…</p>}
            {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error.message || "Something went wrong."}</p>}
            <div ref={bottom} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-stone-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2 text-sm outline-none focus:border-emerald-700"
            />
            <button
              disabled={busy || !input.trim()}
              className="rounded-full bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 leading-relaxed ${
          mine ? "rounded-br-md bg-emerald-800 text-white" : "rounded-bl-md border border-stone-200 bg-white text-stone-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 pl-1 text-[11px] text-stone-500">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      {children}
    </p>
  );
}

const money = (n: number) => `$${n.toFixed(0)}`;

function PartView({
  role,
  part,
  onApprove,
}: {
  role: string;
  part: Part;
  onApprove: (approvalId: string, approved: boolean) => void;
}) {
  switch (part.type) {
    case "text":
      return part.text ? <Bubble role={role}>{part.text.replace(/\*\*/g, "")}</Bubble> : null;

    case "tool-searchProducts":
      if (part.state !== "output-available") return <Pill>Searching the catalog…</Pill>;
      return (
        <div className="grid grid-cols-2 gap-2">
          {part.output.products.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-2.5">
              <div className="flex h-14 items-center justify-center rounded-lg bg-stone-100 text-2xl">{p.image}</div>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-snug">{p.title}</p>
              <p className="mt-0.5 text-[12px] text-stone-600">
                {money(p.price)} · {p.inStock ? <span className="text-emerald-700">In stock</span> : <span className="text-red-600">Sold out</span>}
              </p>
            </div>
          ))}
        </div>
      );

    case "tool-lookupOrder":
      if (part.state !== "output-available") return <Pill>Looking up your order…</Pill>;
      if (!part.output.found) return <Pill>No matching order found</Pill>;
      {
        const o = part.output.order;
        return (
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-[13px]">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Order #{o.orderNumber}</p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-800">{o.status}</span>
            </div>
            <ul className="mt-2 space-y-0.5 text-stone-600">
              {o.items.map((it) => (
                <li key={it.title}>
                  {it.quantity} × {it.title}
                </li>
              ))}
            </ul>
            {o.trackingUrl && (
              <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-emerald-800 underline">
                Track with {o.carrier}
              </a>
            )}
          </div>
        );
      }

    case "tool-getPolicy":
      return <Pill>{part.state === "output-available" ? `Checked our ${part.output.topic} policy` : "Checking our policy…"}</Pill>;

    case "tool-startReturn":
      if (part.state === "approval-requested" && !part.approval.isAutomatic) {
        return (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px]">
            <p className="font-semibold text-amber-900">Confirm your return</p>
            <p className="mt-1 text-amber-900/80">
              Order #{part.input.orderNumber}: {part.input.items.join(", ")}
              <br />
              Reason: {part.input.reason}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onApprove(part.approval.id, true)} className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white">
                Yes, start return
              </button>
              <button onClick={() => onApprove(part.approval.id, false)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold">
                Cancel
              </button>
            </div>
          </div>
        );
      }
      if (part.state === "output-denied") return <Pill>Return cancelled</Pill>;
      if (part.state === "output-available")
        return part.output.created ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-900">
            <p className="font-semibold">Return {part.output.returnId} created</p>
            <p className="mt-1">{part.output.nextSteps}</p>
          </div>
        ) : (
          <Pill>Return not created: {part.output.message}</Pill>
        );
      return <Pill>Preparing your return…</Pill>;

    case "tool-escalateToHuman":
      return part.state === "output-available" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-900">
          <p className="font-semibold">Handed to our team · ticket {part.output.ticketId}</p>
          <p className="mt-1">A person will reply {part.output.expectedResponse}.</p>
        </div>
      ) : (
        <Pill>Connecting you with our team…</Pill>
      );

    default:
      return null;
  }
}
