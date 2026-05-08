'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
  { href: '/admin/teachers', label: 'Teachers', icon: '👨‍🏫' },
  { href: '/admin/classes', label: 'Classes', icon: '🏫' },
  { href: '/admin/subjects', label: 'Subjects', icon: '📚' },
  { href: '/admin/schedules', label: 'Schedules', icon: '🕒' },
  { href: '/admin/fees', label: 'Fees', icon: '💳' },
  { href: '/admin/leads', label: 'Leads', icon: '📩' },
  { href: '/admin/reports', label: 'Reports', icon: '📈' },
  { href: '/admin/salaries', label: 'Salaries', icon: '💰' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileOpen ? (
        <button
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-slate-950 text-white shadow-xl transition-all duration-300',
          collapsed ? 'md:w-20' : 'md:w-72',
          mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-bold">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600">🎓</span>
              {!collapsed ? <span className="text-lg">AcademyPro AI</span> : null}
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-slate-300 hover:bg-white/10 md:hidden"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-auto rounded-3xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-50">
              <p className="font-semibold">Student IDs enabled</p>
              <p className="mt-2 text-xs leading-5 text-blue-100/80">
                Use IDs like STU-A1B2C3 to avoid duplicate student confusion.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="mt-4 hidden rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 md:block"
          >
            {collapsed ? '→' : '← Collapse'}
          </button>
        </div>
      </aside>

      <div className={cn('transition-all duration-300', collapsed ? 'md:pl-20' : 'md:pl-72')}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:hidden"
                aria-label="Open sidebar"
              >
                ☰
              </button>
              <div>
                <p className="text-sm text-slate-500">Admin Panel</p>
                <p className="font-semibold text-slate-950">Academy Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
