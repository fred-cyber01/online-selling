import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900">
      <Navbar />
      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
        <div className="max-w-6xl mx-auto w-full rounded-3xl bg-white shadow-sm border border-slate-100 px-4 sm:px-6 lg:px-8 py-4">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
