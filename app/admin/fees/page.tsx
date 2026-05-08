import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createFeeReminderMessage, createWhatsAppLink } from '@/lib/whatsapp';
import { formatPKR, makeStudentCode } from '@/lib/utils';

export default async function FeesPage() {
  const supabase = await createClient();
  const { data: academy } = await supabase.from('academy_settings').select('*').single();
  const { data: fees = [] } = academy
    ? await supabase.from('fees').select('*, students(id, full_name, father_name, guardian_phone)').eq('academy_id', academy.id).order('fee_month', { ascending: false })
    : { data: [] } as any;

  const collected = fees.reduce((sum: number, fee: any) => sum + Number(fee.paid_amount || 0), 0);
  const pending = fees.reduce((sum: number, fee: any) => fee.status === 'paid' ? sum : sum + Math.max(Number(fee.amount_due || 0) - Number(fee.paid_amount || 0), 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-3xl font-black">Fees</h1><p className="mt-1 text-sm text-slate-500">Collect fees, print slips and send WhatsApp reminders.</p></div>
        <Link href="/admin/fees/new" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Collect Fee</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Collected</p><p className="mt-2 text-3xl font-black">{formatPKR(collected)}</p></div>
        <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Pending</p><p className="mt-2 text-3xl font-black">{formatPKR(pending)}</p></div>
        <div className="rounded-3xl border bg-blue-50 p-6 shadow-sm"><p className="text-sm text-blue-700">Total Records</p><p className="mt-2 text-3xl font-black text-blue-950">{fees.length}</p></div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Student ID</th><th className="p-4">Student</th><th className="p-4">Month</th><th className="p-4">Amount</th><th className="p-4">Paid</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead>
          <tbody className="divide-y">
            {fees.length === 0 ? <tr><td className="p-5 text-slate-500" colSpan={7}>No fees yet.</td></tr> : fees.map((fee: any) => {
              const studentName = fee.students?.full_name || 'Student';
              const parentPhone = fee.students?.guardian_phone || '';
              const message = createFeeReminderMessage({ studentName, month: fee.fee_month, academyName: academy?.academy_name || 'Academy' });
              return (
                <tr key={fee.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-xs font-bold text-blue-700">{makeStudentCode(fee.students?.id)}</td>
                  <td className="p-4 font-semibold">{studentName}<p className="text-xs text-slate-500">Father: {fee.students?.father_name || '-'}</p></td>
                  <td className="p-4 text-slate-600">{fee.fee_month}</td>
                  <td className="p-4">{formatPKR(Number(fee.amount_due || 0))}</td>
                  <td className="p-4">{formatPKR(Number(fee.paid_amount || 0))}</td>
                  <td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">{fee.status}</span></td>
                  <td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/admin/fees/${fee.id}/slip`} className="rounded-xl border px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Print Slip</Link>{fee.status !== 'paid' && parentPhone ? <a href={createWhatsAppLink(parentPhone, message)} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">WhatsApp</a> : null}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
