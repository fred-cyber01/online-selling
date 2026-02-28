import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatRwf } from '../utils/format';

/* ─── Types ─── */
type Product = { id: string; name: string; description?: string; price: number; category: string; imageUrl?: string; imageUrls?: string[]; stock?: number; is_active?: boolean };
type Category = { id: string; name: string; slug: string };
type Order = { id: string; customer_name: string; customer_phone: string; customer_address: string; status?: string; created_at: string; notes?: string; products?: { name: string; price: number; category: string } | null; proof_url?: string };
type UserRow = { id: string; email: string; role: string; fullName: string; createdAt: string };

type Tab = 'overview' | 'products' | 'categories' | 'orders' | 'users' | 'profile';

/* helper */
function authHeaders() {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('customer_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ─── Component ─── */
export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  /* data */
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  /* form states */
  const [prodForm, setProdForm] = useState<Partial<Product>>({});
  const [editingProd, setEditingProd] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ name: string; slug: string }>({ name: '', slug: '' });
  const [editingCat, setEditingCat] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  /* pagination */
  const [productsPage, setProductsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const pageSize = 8;

  /* stored user info for role check */
  const storedUser = (() => {
    try {
      const s = localStorage.getItem('admin_user') || localStorage.getItem('customer_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();

  useEffect(() => {
    if (!storedUser || (storedUser.role !== 'admin' && storedUser.role !== 'manager')) {
      navigate('/');
    }
  }, []);

  /* fetch */
  const fetchAll = async () => {
    const h = { headers: authHeaders() };
    try {
      const [p, c, o, u] = await Promise.all([
        axios.get<Product[]>('/api/products', h),
        axios.get<Category[]>('/api/categories', h),
        axios.get<Order[]>('/api/orders', h).catch(() => ({ data: [] as Order[] })),
        axios.get<UserRow[]>('/api/auth/users', h).catch(() => ({ data: [] as UserRow[] })),
      ]);
      setProducts(p.data);
      setCategories(c.data);
      setOrders(o.data);
      setUsers(u.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* ── Product CRUD ── */
  const saveProd = async () => {
    setLoading(true); setMsg('');
    try {
      // validate category exists in DB
      if (!prodForm.category) {
        setMsg('Please select a category');
        setLoading(false);
        return;
      }
      const catSlugs = categories.map((c) => c.slug);
      if (!catSlugs.includes(prodForm.category as string)) {
        setMsg('Please select a valid category from the list');
        setLoading(false);
        return;
      }

      // send only fields that exist in the products table to avoid unknown-column issues
      const payload: any = {
        name: prodForm.name,
        description: prodForm.description,
        price: prodForm.price,
        category: prodForm.category,
        stock: prodForm.stock,
        is_active: prodForm.is_active ?? true,
        imageUrl: prodForm.imageUrl || (Array.isArray(prodForm.imageUrls) ? prodForm.imageUrls[0] : undefined)
      };

      if (editingProd) {
        await axios.put(`/api/products/${editingProd}`, payload, { headers: authHeaders() });
      } else {
        await axios.post('/api/products', payload, { headers: authHeaders() });
      }
      setProdForm({}); setEditingProd(null); await fetchAll();
      setMsg('Product saved!');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Error'); }
    setLoading(false);
  };
  const deleteProd = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await axios.delete(`/api/products/${id}`, { headers: authHeaders() }); await fetchAll(); } catch { setMsg('Error deleting'); }
  };

  /* ── Category CRUD ── */
  const saveCat = async () => {
    setLoading(true); setMsg('');
    try {
      if (editingCat) {
        await axios.put(`/api/categories/${editingCat}`, catForm, { headers: authHeaders() });
      } else {
        await axios.post('/api/categories', catForm, { headers: authHeaders() });
      }
      setCatForm({ name: '', slug: '' }); setEditingCat(null); await fetchAll();
      setMsg('Category saved!');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Error'); }
    setLoading(false);
  };
  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await axios.delete(`/api/categories/${id}`, { headers: authHeaders() }); await fetchAll(); } catch { setMsg('Error deleting'); }
  };

  /* ── Order status ── */
  const updateStatus = async (id: string, status: string) => {
    try { await axios.put(`/api/orders/${id}/status`, { status }, { headers: authHeaders() }); await fetchAll(); } catch { setMsg('Error updating status'); }
  };

  /* ── User role ── */
  const changeRole = async (id: string, role: string) => {
    try { await axios.put(`/api/auth/users/${id}/role`, { role }, { headers: authHeaders() }); await fetchAll(); } catch { setMsg('Error updating role'); }
  };

  /* upload image file(s) */
  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const h = { headers: authHeaders() };
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fd = new FormData();
        fd.append('file', f);
        const url = editingProd ? `/api/products/upload-image?productId=${editingProd}` : '/api/products/upload-image';
        const res = await axios.post(url, fd, { headers: { ...h.headers, 'Content-Type': 'multipart/form-data' } });
        if (res.data?.imageUrl) uploaded.push(res.data.imageUrl);
      }
      // Persist images coming from storage to the form. Use the first uploaded image as the
      // canonical `imageUrl` stored in the products table so thumbnails come from DB.
      if (uploaded.length > 0) {
        setProdForm((s) => ({ ...s, imageUrl: uploaded[0], imageUrls: uploaded }));
      }
      setMsg('Image(s) uploaded');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Upload failed'); }
  };

  /* profile update */
  const saveProfile = async () => {
    if (!storedUser) return;
    try {
      const h = { headers: authHeaders() };
      await axios.put(`/api/auth/users/${storedUser.id}`, { fullName: storedUser.fullName }, h);
      setMsg('Profile updated');
      await fetchAll();
    } catch { setMsg('Could not update profile'); }
  };

  /* ── Sidebar tabs ── */
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'products', label: 'Products', icon: '📦' },
    { key: 'categories', label: 'Categories', icon: '🏷️' },
    { key: 'orders', label: 'Orders', icon: '🛒' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'profile', label: 'Profile', icon: '🙍' },
  ];

  const inputClass = theme === 'dark'
    ? 'w-full rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500'
    : 'w-full rounded-lg bg-white border border-slate-200 text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300';
  const btnPrimary = theme === 'dark'
    ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-60'
    : 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-60';
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    confirmed: 'bg-blue-500/20 text-blue-300',
    shipped: 'bg-purple-500/20 text-purple-300',
    delivered: 'bg-emerald-500/20 text-emerald-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };

  const containerClass = theme === 'dark' ? 'theme-dark' : 'theme-light';

  return (
    <div className={`${containerClass} app-shell fixed inset-0 flex`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out sidebar`}>
        <div className="h-16 flex items-center gap-3 px-6 border-b" style={theme === 'dark' ? { borderColor: 'rgba(148,163,184,.06)' } : { borderColor: 'rgba(2,6,23,.04)' }}>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm">KS</span>
          <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-semibold tracking-tight`}>Admin Panel</span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{storedUser?.email}</p>
          <p className="text-xs" style={{ color: 'var(--btn-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{storedUser?.role}</p>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); localStorage.removeItem('customer_token'); localStorage.removeItem('customer_user'); navigate('/'); }}
            className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b shrink-0" style={theme === 'dark' ? { borderColor: 'rgba(148,163,184,.06)' } : { borderColor: 'rgba(2,6,23,.04)' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-500 hover:text-black">
              <span className="flex flex-col gap-1"><span className="h-0.5 w-5 bg-current" /><span className="h-0.5 w-5 bg-current" /><span className="h-0.5 w-5 bg-current" /></span>
            </button>
            <h1 className={`text-lg font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tab}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="px-3 py-1 rounded-lg text-sm border"
            >
              {theme === 'dark' ? 'Light' : 'Dark'} theme
            </button>
            <button type="button" onClick={() => navigate('/')} className={`text-xs transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-slate-900'}`}>← Back to shop</button>
          </div>
        </header>

        {/* scrollable content */}
        <main className="flex-1 overflow-auto p-6">
          {msg && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm text-amber-300 flex items-center justify-between">
              {msg}
              <button type="button" onClick={() => setMsg('')} className="text-amber-400 hover:text-white ml-4">✕</button>
            </div>
          )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <div className="space-y-6">
                <div className="rounded-2xl p-5 border card">
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-4`}>Your profile</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input className={inputClass} placeholder="Full name" value={storedUser?.fullName || ''} onChange={(e) => { try { const s = JSON.parse(localStorage.getItem('admin_user')||'null'); if (s) { s.fullName = e.target.value; localStorage.setItem('admin_user', JSON.stringify(s)); } } catch {} }} />
                    <input className={inputClass} placeholder="Email" value={storedUser?.email || ''} disabled />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={saveProfile} className={btnPrimary} style={theme === 'dark' ? { background: 'linear-gradient(135deg, #f97316, #f59e0b)' } : { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                      Save profile
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Products', value: products.length, color: 'from-blue-500 to-cyan-500', icon: '📦' },
                  { label: 'Categories', value: categories.length, color: 'from-purple-500 to-pink-500', icon: '🏷️' },
                  { label: 'Orders', value: orders.length, color: 'from-amber-500 to-orange-500', icon: '🛒' },
                  { label: 'Users', value: users.length, color: 'from-emerald-500 to-teal-500', icon: '👥' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl p-5 border card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{s.icon}</span>
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${s.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-5 border card">
                  <h3 className="text-sm font-semibold text-white mb-3">Recent Orders</h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="rounded-lg bg-slate-800/40 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium">{o.customer_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[o.status || 'pending'] || statusColors.pending}`}>{o.status || 'pending'}</span>
                        </div>
                        <p className="text-slate-400 mt-1">{o.products?.name} · {o.products?.price ? formatRwf(o.products.price) : ''}</p>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-xs text-slate-500">No orders yet.</p>}
                  </div>
                </div>
                <div className="rounded-2xl p-5 border card">
                  <h3 className="text-sm font-semibold text-white mb-3">Team Members</h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {users.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 p-3 text-xs">
                        <div>
                          <p className="text-slate-200 font-medium">{u.fullName || u.email}</p>
                          <p className="text-slate-400">{u.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : u.role === 'manager' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <div className="space-y-6">
              {/* form */}
              <div className="rounded-2xl p-5 border card">
                <h3 className="text-sm font-semibold text-white mb-4">{editingProd ? 'Edit Product' : 'Add New Product'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Product name" value={prodForm.name || ''} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} />
                  <div>
                    <input className={inputClass} placeholder="Price" type="number" step="0.01" value={prodForm.price ?? ''} onChange={(e) => setProdForm({ ...prodForm, price: parseFloat(e.target.value) || 0 })} />
                    {typeof prodForm.price === 'number' && !Number.isNaN(prodForm.price) && (
                      <div className="text-xs text-slate-400 mt-1">{formatRwf(prodForm.price)}</div>
                    )}
                  </div>
                  <select className={inputClass} value={prodForm.category || ''} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                  <input className={inputClass} placeholder="Stock" type="number" value={prodForm.stock ?? ''} onChange={(e) => setProdForm({ ...prodForm, stock: parseInt(e.target.value) || 0 })} />
                  <input className={inputClass + ' md:col-span-2'} placeholder="Description" value={prodForm.description || ''} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} />
                  <input className={inputClass + ' md:col-span-2'} placeholder="Image URL" value={prodForm.imageUrl || ''} onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })} />
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400 block mb-2">Upload image files (any format)</label>
                    <input type="file" className="w-full text-sm" onChange={(e) => uploadFiles(e.target.files)} multiple />
                    {prodForm.imageUrls && Array.isArray(prodForm.imageUrls) && (
                      <div className="mt-2 flex gap-2">
                        {prodForm.imageUrls.map((u, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <img key={i} src={u} className="w-12 h-12 rounded object-cover" alt={`uploaded-${i}`} />
                        ))}
                      </div>
                    )}
                    {prodForm.imageUrl && !prodForm.imageUrls && (
                      <div className="mt-2"><img src={prodForm.imageUrl} className="w-20 h-20 rounded object-cover" alt="uploaded" /></div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={saveProd} disabled={loading} className={btnPrimary} style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
                    {loading ? 'Saving...' : editingProd ? 'Update' : 'Add Product'}
                  </button>
                  {editingProd && <button type="button" onClick={() => { setEditingProd(null); setProdForm({}); }} className="text-xs text-slate-400 hover:text-white">Cancel</button>}
                </div>
              </div>

              {/* table */}
              <div className="rounded-2xl border overflow-hidden card">
                <div className="overflow-x-auto table-container table-zebra">
                  <table className="w-full text-sm">
                    <thead>
                          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider">
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Stock</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice((productsPage-1)*pageSize, productsPage*pageSize).map((p) => (
                          <tr key={p.id} className="border-b border-slate-800/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-[10px] text-slate-400">IMG</div>}
                              <span className="text-slate-200 font-medium">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">{(categories.find((c) => c.slug === p.category)?.name) || p.category}</td>
                          <td className="px-5 py-3">{formatRwf(p.price ?? 0)}</td>
                          <td className="px-5 py-3">{p.stock ?? '—'}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="table-actions inline-flex items-center gap-2 justify-end">
                              <button type="button" onClick={() => { setEditingProd(p.id); setProdForm(p); }} className="edit">Edit</button>
                              <button type="button" onClick={() => deleteProd(p.id)} className="delete">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No products yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 flex items-center justify-end gap-2">
                  <button disabled={productsPage === 1} onClick={() => setProductsPage((p) => Math.max(1, p-1))} className="px-3 py-1 rounded border">Prev</button>
                  <div className="text-sm text-slate-400">Page {productsPage} / {Math.max(1, Math.ceil(products.length / pageSize))}</div>
                  <button disabled={productsPage >= Math.ceil(products.length / pageSize)} onClick={() => setProductsPage((p) => p+1)} className="px-3 py-1 rounded border">Next</button>
                </div>
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {tab === 'categories' && (
            <div className="space-y-6">
              <div className="rounded-2xl p-5 border card">
                <h3 className="text-sm font-semibold text-white mb-4">{editingCat ? 'Edit Category' : 'Add New Category'}</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Category name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                  <input className={inputClass} placeholder="Slug (e.g. children-shoes)" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={saveCat} disabled={loading} className={btnPrimary} style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
                    {loading ? 'Saving...' : editingCat ? 'Update' : 'Add Category'}
                  </button>
                  {editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', slug: '' }); }} className="text-xs text-slate-400 hover:text-white">Cancel</button>}
                </div>
              </div>
              <div className="rounded-2xl border overflow-hidden card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Slug</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id} className="border-b border-slate-800/50 transition-colors">
                        <td className="px-5 py-3 font-medium">{c.name}</td>
                        <td className="px-5 py-3">{c.slug}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="table-actions inline-flex items-center gap-2 justify-end">
                            <button type="button" onClick={() => { setEditingCat(c.id); setCatForm({ name: c.name, slug: c.slug }); }} className="edit">Edit</button>
                            <button type="button" onClick={() => deleteCat(c.id)} className="delete">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">No categories yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div className="rounded-2xl border overflow-hidden card">
              <div className="overflow-x-auto table-container table-zebra">
                <table className="w-full text-sm">
                  <thead>
                      <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Proof</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-slate-200 font-medium">{o.customer_name}</p>
                          <p className="text-[11px] text-slate-500">{o.customer_address}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-300">{o.products?.name || '—'}</td>
                        <td className="px-5 py-3 text-slate-400">{o.customer_phone}</td>
                        <td className="px-5 py-3">
                          {o.proof_url ? (
                            <a href={o.proof_url} target="_blank" rel="noreferrer" className="inline-block rounded overflow-hidden border" title="Open proof in new tab">
                              <img src={o.proof_url} alt="proof" className="w-20 h-16 object-cover" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[o.status || 'pending'] || statusColors.pending}`}>{o.status || 'pending'}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3 text-right">
                          <select
                            className="rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 focus:outline-none"
                            value={o.status || 'pending'}
                            onChange={(e) => updateStatus(o.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {o.proof_url && o.status !== 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(o.id, 'confirmed')}
                              className="ml-2 text-xs px-2 py-1 rounded border bg-emerald-600/10 text-emerald-300"
                            >
                              Verify payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No orders yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="rounded-2xl border overflow-hidden card">
              <div className="overflow-x-auto table-container table-zebra">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider">
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Joined</th>
                      <th className="px-5 py-3 text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice((usersPage-1)*pageSize, usersPage*pageSize).map((u) => (
                      <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold">
                              {(u.fullName || u.email).charAt(0).toUpperCase()}
                            </span>
                            <span className="text-slate-200 font-medium">{u.fullName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : u.role === 'manager' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3 text-right">
                          {storedUser?.role === 'admin' && (
                            <select
                              className="rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 focus:outline-none"
                              value={u.role}
                              onChange={(e) => changeRole(u.id, e.target.value)}
                            >
                              <option value="customer">Customer</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="p-3 flex items-center justify-end gap-2">
                <button disabled={usersPage === 1} onClick={() => setUsersPage((p) => Math.max(1, p-1))} className="px-3 py-1 rounded border">Prev</button>
                <div className="text-sm text-slate-400">Page {usersPage} / {Math.max(1, Math.ceil(users.length / pageSize))}</div>
                <button disabled={usersPage >= Math.ceil(users.length / pageSize)} onClick={() => setUsersPage((p) => p+1)} className="px-3 py-1 rounded border">Next</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
