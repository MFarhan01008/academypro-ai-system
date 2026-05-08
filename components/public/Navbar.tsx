'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';

const links = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/classes', 'Classes'],
  ['/teachers', 'Teachers'],
  ['/fees', 'Fees'],
  ['/timetable', 'Timetable'],
  ['/admission', 'Admission'],
  ['/contact', 'Contact'],
] as const;

export function Navbar() {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[88px] items-center justify-between gap-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-3 pr-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <GraduationCap size={22} />
            </span>

            <span className="leading-tight">
              <span className="block text-[15px] font-black tracking-tight text-slate-950 sm:text-[18px]">
                AcademyPro AI
              </span>
              <span className="hidden text-xs font-semibold text-slate-500 xl:block">
                Smart academy information system
              </span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex xl:gap-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={
                  active(href)
                    ? 'rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100 xl:px-4'
                    : 'rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 xl:px-4'
                }
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Contact Us
            </Link>
            <Link
              href="/admission"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Get Admission Info
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/admission"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20"
            >
              Admission
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 py-3 lg:hidden">
          <nav className="flex flex-wrap items-center gap-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={
                  active(href)
                    ? 'rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100'
                    : 'rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950'
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
