import { AssistantShell } from "@/components/assistant-shell";
import { PRODUCTS } from "@/lib/mock-data";

export default function StorePage() {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <AssistantShell />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <p className="text-lg font-bold tracking-tight">
            ⛰️ Northpeak <span className="font-normal text-stone-500">Outfitters</span>
          </p>
          <nav className="hidden gap-6 text-sm text-stone-600 sm:flex">
            <span>Jackets</span>
            <span>Footwear</span>
            <span>Packs</span>
            <span>Camping</span>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Autumn collection</p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">Gear built for the long way up.</h1>
          <p className="mt-4 max-w-lg text-emerald-100/90">
            Free shipping over $75, 30-day returns and a 2-year warranty. Questions? Our assistant tracks orders and starts returns in seconds.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-xl font-semibold">Best sellers</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {PRODUCTS.slice(0, 8).map((p) => (
            <article key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 text-5xl">{p.image}</div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{p.title}</h3>
              <p className="mt-1 text-sm text-stone-600">
                ${p.price} {p.inStock === 0 && <span className="text-red-600">· Sold out</span>}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-stone-400">Northpeak Outfitters is a fictional store created for this demo.</p>
      </main>
    </div>
  );
}
