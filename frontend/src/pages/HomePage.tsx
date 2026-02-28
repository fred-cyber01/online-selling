import { useEffect, useState } from 'react';
import axios from 'axios';
import { Product, ProductCard } from '../components/products/ProductCard';

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/categories'),
      axios.get<Product[]>('/api/products')
    ])
      .then(([cRes, pRes]) => {
        const cats: { id: string; name: string; slug: string }[] = cRes.data || [];
        setCategoriesList(cats);
        const map: Record<string, string> = {};
        cats.forEach((c) => { map[c.slug] = c.name; });
        const mapped = (pRes.data || []).map((p) => ({ ...p, category: map[p.category] || p.category }));
        setProducts(mapped.slice(0, 6));
      })
      .catch(() => setProducts([]));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Ass Market Place Explore
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-slate-900">
              37
            </span>
            <span>orders last 7 days</span>
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-[260px,1fr] gap-6 items-start">
        <aside className="hidden lg:flex flex-col gap-4 rounded-3xl bg-white border border-slate-100 p-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              Explore
            </p>
            <p className="text-[11px] text-slate-500">
              Popular products and new drops.
            </p>
          </div>
          <nav className="space-y-1 text-xs">
            <button className="w-full flex items-center justify-between rounded-2xl bg-slate-900 text-white px-3 py-2">
              <span>Explore new</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                Kids & women
              </span>
            </button>
            <button className="w-full text-left rounded-2xl px-3 py-2 text-slate-700 hover:bg-slate-50">
              Clothing and shoes
            </button>
            <button className="w-full text-left rounded-2xl px-3 py-2 text-slate-700 hover:bg-slate-50">
              Small bags
            </button>
            <button className="w-full text-left rounded-2xl px-3 py-2 text-slate-700 hover:bg-slate-50">
              Electronics
            </button>
          </nav>
        </aside>

        <div className="space-y-5">
          <div className="grid xl:grid-cols-[1.5fr,1fr] gap-4">
            <div className="rounded-3xl bg-gradient-to-r from-[#fef3c7] via-[#fce7f3] to-[#e0f2fe] p-5 flex flex-col justify-between shadow-sm min-h-[220px]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 max-w-md">
                  <p className="text-[11px] font-semibold text-orange-500">
                    GET UP TO 50% OFF
                  </p>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                        New arrivals for
                        <br />
                        women & children&apos;s clothes.
                      </h1>
                      <p className="text-xs text-slate-600 max-w-md">
                        Comfortable everyday clothes for women and children. Order quickly via in‑app checkout.
                      </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categoriesList && categoriesList.length > 0 ? (
                      categoriesList.slice(0, 2).map((c, idx) => (
                        <a
                          key={c.id}
                          href={`/products?category=${encodeURIComponent(c.slug)}`}
                          className={
                            idx === 0
                              ? 'inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-slate-800'
                              : 'inline-flex items-center rounded-full bg-white px-4 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm hover:bg-slate-50'
                          }
                        >
                          {`Shop ${c.name}`}
                        </a>
                      ))
                    ) : (
                      <>
                        <a
                          href="/products?category=children-clothes"
                          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-slate-800"
                        >
                          Shop children
                        </a>
                        <a
                          href="/products?category=women-clothes"
                          className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-[11px] font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                          Shop women
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="hidden md:block rounded-3xl bg-white/70 border border-white/60 shadow-sm w-44 h-40 overflow-hidden">
                  {/* Place your hero image here, e.g. move the provided image into frontend/public and reference it as /hero-fashion.png */}
                  <div className="h-full w-full bg-gradient-to-b from-amber-200 via-pink-100 to-sky-100" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl bg-[#fef3c7] p-4 shadow-sm flex flex-col justify-between h-28">
                <div>
                  <p className="text-[11px] text-slate-600">Winter&apos;s weekend</p>
                  <p className="text-sm font-semibold text-slate-900">
                    Keep it casual & warm
                  </p>
                </div>
              </div>
              <div className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm flex flex-col justify-between h-28">
                <div>
                  <p className="text-[11px] text-slate-500">Bring bold fashion</p>
                  <p className="text-sm font-semibold text-slate-900">
                    Layers on layers
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section id="featured" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Explore favourites
              </h2>
              <a
                href="/products"
                className="text-[11px] font-medium text-accent hover:text-accent/90"
              >
                View all
              </a>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.length > 0 ? (
                  products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
              ) : (
                ([
                  { id: 'demo-1', name: 'Striped Cotton Tee', price: 12.99, category: 'Children Clothes', description: 'Soft striped tee for everyday play', imageUrl: '' },
                  { id: 'demo-2', name: 'Floral Dress', price: 24.5, category: 'Women Clothes', description: 'Lightweight seasonal dress', imageUrl: '' },
                  { id: 'demo-3', name: 'Comfy Joggers', price: 18.0, category: 'Children Clothes', description: 'Stretchy and durable joggers', imageUrl: '' },
                ] as Product[]).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

