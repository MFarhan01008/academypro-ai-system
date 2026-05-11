import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createFeeReminderMessage, createWhatsAppLink } from "@/lib/whatsapp";
import { formatMonth, formatPKR, makeStudentCode } from "@/lib/utils";

export default async function FeesPage() {
  const supabase = await createClient();

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("*")
    .single();

  const { data: feeData } = academy?.id
    ? await supabase
        .from("fees")
        .select(
          `
          *,
          students(id, full_name, father_name, guardian_phone, student_code),
          teachers(full_name, teacher_code),
          class_schedules(batch_name, start_time, end_time)
        `
        )
        .eq("academy_id", academy.id)
        .order("fee_month", { ascending: false })
    : ({ data: [] } as any);

  const fees = Array.isArray(feeData) ? feeData : [];

  const collected = fees.reduce((sum: number, fee: any) => {
    return sum + Number(fee.paid_amount || 0);
  }, 0);

  const pending = fees.reduce((sum: number, fee: any) => {
    const due = Number(fee.amount_due || 0);
    const discount = Number(fee.discount_amount || 0);
    const paid = Number(fee.paid_amount || 0);
    return fee.status === "paid" ? sum : sum + Math.max(due - discount - paid, 0);
  }, 0);

  const paidCount = fees.filter((fee: any) => fee.status === "paid").length;
  const unpaidCount = fees.filter((fee: any) => fee.status !== "paid").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Fees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Collect fees, print slips, open student history aur WhatsApp reminders send karo.
          </p>
        </div>

        <Link
          href="/admin/fees/new"
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Collect Fee
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Collected</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatPKR(collected)}</p>
        </div>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatPKR(pending)}</p>
        </div>
        <div className="rounded-3xl border bg-blue-50 p-6 shadow-sm">
          <p className="text-sm text-blue-700">Paid Records</p>
          <p className="mt-2 text-3xl font-black text-blue-950">{paidCount}</p>
        </div>
        <div className="rounded-3xl border bg-amber-50 p-6 shadow-sm">
          <p className="text-sm text-amber-700">Unpaid / Due</p>
          <p className="mt-2 text-3xl font-black text-amber-950">{unpaidCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Student ID</th>
                <th className="p-4">Student</th>
                <th className="p-4">Month</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Teacher / Timing</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {fees.length === 0 ? (
                <tr>
                  <td className="p-5 text-slate-500" colSpan={9}>
                    No fees yet.
                  </td>
                </tr>
              ) : (
                fees.map((fee: any) => {
                  const studentName = fee.students?.full_name || "Student";
                  const parentPhone = fee.students?.guardian_phone || "";
                  const studentId = fee.students?.id || "";
                  const studentCode = fee.students?.student_code || makeStudentCode(studentId);
                  const amount = Number(fee.amount_due || 0);
                  const discount = Number(fee.discount_amount || 0);
                  const paid = Number(fee.paid_amount || 0);
                  const balance = Math.max(amount - discount - paid, 0);
                  const message = createFeeReminderMessage({
                    studentName,
                    month: formatMonth(fee.fee_month),
                    academyName: academy?.academy_name || "Academy",
                  });

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-xs font-bold text-blue-700">
                        {studentCode}
                      </td>

                      <td className="p-4">
                        {studentId ? (
                          <Link
                            href={`/admin/students/${studentId}`}
                            className="font-semibold text-slate-950 hover:text-blue-600"
                          >
                            {studentName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-950">{studentName}</span>
                        )}
                        <p className="text-xs text-slate-500">
                          Father: {fee.students?.father_name || "-"}
                        </p>
                      </td>

                      <td className="p-4 text-slate-600">{formatMonth(fee.fee_month)}</td>
                      <td className="p-4">{formatPKR(amount)}</td>
                      <td className="p-4">{formatPKR(paid)}</td>
                      <td className="p-4 font-semibold text-slate-950">{formatPKR(balance)}</td>

                      <td className="p-4">
                        {fee.teachers?.full_name || "-"}
                        <p className="text-xs text-slate-500">
                          {fee.class_schedules?.start_time
                            ? `${fee.class_schedules.start_time} - ${fee.class_schedules.end_time}`
                            : fee.class_schedules?.batch_name || "-"}
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">
                          {fee.status || "pending"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {studentId ? (
                            <Link
                              href={`/admin/students/${studentId}`}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Student
                            </Link>
                          ) : null}

                          <Link
                            href={`/admin/fees/${fee.id}/slip`}
                            className="rounded-xl border px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Print Slip
                          </Link>

                          {fee.status !== "paid" && parentPhone ? (
                            <a
                              href={createWhatsAppLink(parentPhone, message)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
