import Link from 'next/link';
import { GraduationCap, MapPin, MessageCircle, Phone, Clock3 } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { createClient } from '@/lib/supabase/server';
import { createWhatsAppLink } from '@/lib/whatsapp';

export async function Footer() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('academy_settings')
    .select('academy_name, phone, whatsapp_number, address, city')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const academyName = data?.academy_name || 'AcademyPro AI';
  const phone = data?.phone || '03183571588';
  const whatsapp = data?.whatsapp_number || phone;
  const address = data?.address || 'Jan Muhammad Road, Quetta';
  const city = data?.city || 'Pakistan';
  const wa = createWhatsAppLink(
    whatsapp,
    `Assalam o Alaikum, mujhe ${academyName} ke bare mein information chahiye.`
  );

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-white">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_0.9fr_1fr] lg:gap-12">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <GraduationCap size={24} />
              </span>
              <div>
                <span className="block text-2xl font-black">{academyName}</span>
                <span className="text-sm text-slate-400">For parents, students and academy teams</span>
              </div>
            </Link>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
              Academy ki classes, teachers, fee structure, timetable, admission process aur contact details aik hi
              clean website mein. Parents aur students yahan se quickly information hasil kar sakte hain.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300">Classes & Courses</span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300">Teachers</span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300">Fee Structure</span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300">Live AI Help</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black">Quick Links</h3>
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-medium text-slate-300 sm:grid-cols-1">
              <Link href="/about" className="transition hover:text-white">About</Link>
              <Link href="/classes" className="transition hover:text-white">Classes</Link>
              <Link href="/teachers" className="transition hover:text-white">Teachers</Link>
              <Link href="/fees" className="transition hover:text-white">Fees</Link>
              <Link href="/timetable" className="transition hover:text-white">Timetable</Link>
              <Link href="/admission" className="transition hover:text-white">Admission</Link>
              <Link href="/contact" className="transition hover:text-white">Contact</Link>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black">Contact Info</h3>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <p className="flex items-start gap-3">
                <Phone size={16} className="mt-1 shrink-0 text-blue-400" />
                <span>{phone}</span>
              </p>
              <p className="flex items-start gap-3">
                <MessageCircle size={16} className="mt-1 shrink-0 text-blue-400" />
                <span>{whatsapp}</span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 shrink-0 text-blue-400" />
                <span>{address}, {city}</span>
              </p>
              <p className="flex items-start gap-3">
                <Clock3 size={16} className="mt-1 shrink-0 text-blue-400" />
                <span>Academy timings mein contact karein for quick response</span>
              </p>
            </div>

            <div className="mt-6">
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <MessageCircle size={16} />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-slate-800">
        <Container className="flex flex-col gap-2 py-5 text-center text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} {academyName}. All rights reserved.</p>
          <p>Built for local academies in Pakistan.</p>
        </Container>
      </div>
    </footer>
  );
}
