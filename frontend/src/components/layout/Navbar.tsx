import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import axios from 'axios';

type SearchResult = {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
};

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, handleLogout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  /* ── Search ── */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setShowResults(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get<SearchResult[]>('/api/products', { params: { search: query } });
        setResults(res.data.slice(0, 8));
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  /* click outside to close */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    axios.get<{ id: string; name: string; slug: string }[]>('/api/categories')
      .then((res) => { if (mounted) setCategories(res.data || []); })
      .catch(() => { if (mounted) setCategories([]); });
    return () => { mounted = false; };
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-30">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
            AM
          </span>
          <span className="font-semibold text-slate-900 tracking-tight hidden sm:inline">
            Ass Market Place
          </span>
        </Link>

        {/* search bar */}
        <div ref={searchRef} className="relative flex-1 max-w-xs hidden sm:block">
          <input
            type="text"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="w-full rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
            id="product-search-input"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>

          {showResults && results.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl bg-white border border-slate-100 shadow-xl py-2 z-50 max-h-80 overflow-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setShowResults(false);
                    setQuery('');
                    navigate(`/products?search=${encodeURIComponent(p.name)}`);
                  }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">IMG</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category} · {new Intl.NumberFormat('en-RW',{style:'currency',currency:'RWF',maximumFractionDigits:0}).format(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && query.trim() && results.length === 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl bg-white border border-slate-100 shadow-xl py-4 z-50 text-center text-sm text-slate-500">
              No products found
            </div>
          )}
        </div>

        {/* hamburger */}
        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-slate-800" />
            <span className="h-0.5 w-5 bg-slate-800" />
            <span className="h-0.5 w-5 bg-slate-800" />
          </span>
        </button>

        {/* desktop nav */}
        <div className="hidden sm:flex items-center gap-4 text-sm font-medium shrink-0">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-accent' : 'text-slate-700 hover:text-accent'
            }
          >
            Home
          </NavLink>

          <div className="relative group">
            <button
              type="button"
              className="text-slate-700 hover:text-accent inline-flex items-center gap-1"
            >
              Products
              <span className="text-xs">▾</span>
            </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all absolute top-full mt-2 w-52 rounded-lg bg-white shadow-lg border border-slate-100 py-2">
                {categories && categories.length > 0 ? (
                  categories.map((c) => (
                    <NavLink key={c.id} to={`/products?category=${c.slug}`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{c.name}</NavLink>
                  ))
                ) : (
                  <>
                    <NavLink to="/products?category=children-clothes" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Children Clothes</NavLink>
                    <NavLink to="/products?category=women-clothes" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Women Clothes</NavLink>
                    <NavLink to="/products?category=small-bags" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Small Bags</NavLink>
                    <NavLink to="/products?category=accessories" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Accessories</NavLink>
                  </>
                )}
            </div>
          </div>

          <NavLink
            to="/cart"
            className="relative inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Cart
            {totalItems > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] text-white">
                {totalItems}
              </span>
            )}
          </NavLink>

          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Sign in
            </button>
          ) : (
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[11px] text-accent font-semibold">
                  {user?.fullName?.charAt(0).toUpperCase() ?? user?.email.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">
                  {user?.fullName || user?.email}
                </span>
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg border border-slate-100 py-2 text-xs">
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <NavLink
                    to="/admin/dashboard"
                    className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    Dashboard
                  </NavLink>
                )}
                <NavLink
                  to="/customer/dashboard"
                  className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  My orders
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-1.5 text-slate-500 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 text-sm">
          {/* mobile search */}
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <NavLink to="/" onClick={() => setOpen(false)} className="block text-slate-700">Home</NavLink>
              <details className="text-slate-700">
            <summary className="cursor-pointer">Products</summary>
            <div className="mt-1 ml-3 space-y-1 text-xs">
              <NavLink to="/products?category=children-clothes" onClick={() => setOpen(false)} className="block text-slate-600">Children Clothes</NavLink>
              <NavLink to="/products?category=women-clothes" onClick={() => setOpen(false)} className="block text-slate-600">Women Clothes</NavLink>
              <NavLink to="/products?category=small-bags" onClick={() => setOpen(false)} className="block text-slate-600">Small Bags</NavLink>
              <NavLink to="/products?category=accessories" onClick={() => setOpen(false)} className="block text-slate-600">Accessories</NavLink>
            </div>
          </details>
          <NavLink to="/cart" onClick={() => setOpen(false)} className="block text-slate-700">
            Cart {totalItems > 0 && `(${totalItems})`}
          </NavLink>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="mt-2 w-full inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white"
            >
              Sign in
            </button>
          )}
        </div>
      )}
      {/* Modal removed: login/register is now a full page at /login and /register */}
    </header>
  );
}
