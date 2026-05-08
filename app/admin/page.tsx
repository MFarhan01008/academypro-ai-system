import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPKR } from '@/lib/utils';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: academy } = await supabase.from('academy_settings').select('*').single();

  const academyId = academy?.id;
  const [{ count: totalStudents }, { count: activeClasses }, { count: newLeads }, { data: fees = [] }] = await Promise.all([
    academyId ? supabase.from('students').select('*', { count: 'exact', head: true }).eq('academy_id', academyId) : Promise.resolve({ count: 0 } as any),
    academyId ? supabase.from('classes').select('*', { count: 'exact', head: true }).eq('academy_id', academyId).eq('status', 'active') : Promise.resolve({ count: 0 } as any),
    academyId ? supabase.from('admission_leads').select('*', { count: 'exact', head: true }).eq('academy_id', academyId).eq('status', 'new') : Promise.resolve({ count: 0 } as any),
    academyId ? supabase.from('fees').select('amount_due,paid_amount,status,created_at,students(full_name)').eq('academy_id', academyId).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] } as any),
  ]);

  const collected = fees.reduce((sum: number, fee: any) => sum + Number(fee.paid_amount || 0), 0);
  const pending = fees.reduce((sum: number, fee: any) => fee.status === 'paid' ? sum : sum + Math.max(Number(fee.amount_due || 0) - Number(fee.paid_amount || 0), 0), 0);

  const cards = [
    { title: 'Total Students', value: String(totalStudents || 0), icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { title: 'Fee Collected', value: formatPKR(collected), icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
    { title: 'Pending Amount', value: formatPKR(pending), icon: '⏳', color: 'bg-orange-50 text-orange-700' },
    { title: 'New Leads', value: String(newLeads || 0), icon: '📩', color: 'bg-purple-50 text-purple-700' },
    { title: 'Active Classes', value: String(activeClasses || 0), icon: '🎓', color: 'bg-sky-50 text-sky-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Welcome back</p>
          <h1 className="text-3xl font-black text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A quick overview of students, fees and leads.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/fees/new" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20">Collect Fee</Link>
          <Link href="/admin/students/new" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">Add Student</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${card.color}`}>{card.icon}</div>
            <p className="mt-4 text-sm text-slate-500">{card.title}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="text-lg font-bold">Recent Fees</h2>
            <Link href="/admin/fees" className="text-sm font-semibold text-blue-600">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Student</th><th className="p-4">Amount</th><th className="p-4">Paid</th><th className="p-4">Status</th></tr></thead>
              <tbody className="divide-y">
                {fees.length === 0 ? <tr><td className="p-5 text-slate-500" colSpan={4}>No fee records yet.</td></tr> : fees.map((fee: any, index: number) => (
                  <tr key={index}><td className="p-4 font-semibold">{fee.students?.full_name || '-'}</td><td className="p-4">{formatPKR(Number(fee.amount_due || 0))}</td><td className="p-4">{formatPKR(Number(fee.paid_amount || 0))}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">{fee.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Student Tracking</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Every student is shown with a unique Student ID like STU-A1B2C3, so same-name students are easy to track in fees and reports.</p>
          <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Tip: Search by name or Student ID while collecting fees.</div>
        </div>
      </div>
    </div>
  );
}
