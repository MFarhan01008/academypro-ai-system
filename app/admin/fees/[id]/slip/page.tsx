import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { makeStudentCode } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatPKR(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMonth(date?: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const [hours, minutes] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hours || 0));
  date.setMinutes(Number(minutes || 0));

  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FeeSlipPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: fee, error } = await supabase
    .from("fees")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !fee) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-950">Fee Slip Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Fee record nahi mila ya access allowed nahi hai.
        </p>

        <Link
          href="/admin/fees"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Fees
        </Link>
      </div>
    );
  }

  const [{ data: academy }, { data: student }] = await Promise.all([
    supabase.from("academy_settings").select("*").eq("id", fee.academy_id).maybeSingle(),
    supabase.from("students").select("*").eq("id", fee.student_id).maybeSingle(),
  ]);

  const [classRes, subjectRes, teacherRes, scheduleRes] = await Promise.all([
    student?.class_id
      ? supabase.from("classes").select("class_name").eq("id", student.class_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    student?.subject_id
      ? supabase.from("subjects").select("subject_name").eq("id", student.subject_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    (fee.teacher_id || student?.teacher_id)
      ? supabase
          .from("teachers")
          .select("full_name, teacher_code")
          .eq("id", fee.teacher_id || student.teacher_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    (fee.schedule_id || student?.schedule_id)
      ? supabase
          .from("class_schedules")
          .select("batch_name, days, start_time, end_time, room")
          .eq("id", fee.schedule_id || student.schedule_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const className = classRes.data?.class_name || "-";
  const subjectName = subjectRes.data?.subject_name || "-";
  const teacherName = teacherRes.data?.full_name || "-";
  const teacherCode = teacherRes.data?.teacher_code || "";
  const schedule = scheduleRes.data as any;

  const amountDue = Number(fee.amount_due || 0);
  const discount = Number(fee.discount_amount || 0);
  const paidAmount = Number(fee.paid_amount || 0);
  const netAmount = Math.max(amountDue - discount, 0);
  const balance = Math.max(netAmount - paidAmount, 0);
  const receiptNo = `FEE-${String(fee.id).slice(0, 8).toUpperCase()}`;

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/admin/fees"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Fees
          </Link>

          <PrintButton />
        </div>

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-slate-950 p-7 text-white print:bg-white print:text-slate-950">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {academy?.logo_url ? (
                  <img
                    src={academy.logo_url}
                    alt="Academy logo"
                    className="h-16 w-16 rounded-2xl bg-white object-cover p-1"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
                    {(academy?.academy_name || "A").slice(0, 1)}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    {academy?.academy_name || "AcademyPro AI"}
                  </h1>
                  <p className="mt-1 text-sm text-slate-300 print:text-slate-600">
                    {academy?.address || "Academy Address"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300 print:text-slate-600">
                    Phone: {academy?.phone || "-"} | WhatsApp: {academy?.whatsapp_number || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left print:border-slate-200 print:bg-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200 print:text-blue-700">
                  Official Fee Slip
                </p>
                <p className="mt-2 text-sm font-semibold">Receipt: {receiptNo}</p>
                <p className="mt-1 text-sm">Generated: {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          <div className="p-7">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3 print:bg-white">
              <Info label="Student ID" value={makeStudentCode(student?.id)} strong />
              <Info label="Student Name" value={student?.full_name || "-"} strong />
              <Info label="Father Name" value={student?.father_name || "-"} />
              <Info label="Class" value={className} />
              <Info label="Subject" value={subjectName} />
              <Info label="Teacher" value={teacherCode ? `${teacherName} (${teacherCode})` : teacherName} />
              <Info label="Batch" value={schedule?.batch_name || "Regular"} />
              <Info
                label="Timing"
                value={schedule?.start_time ? `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}` : "-"}
              />
              <Info label="Days / Room" value={`${schedule?.days || "-"}${schedule?.room ? ` • ${schedule.room}` : ""}`} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <AmountCard label="Monthly Fee" value={formatPKR(amountDue)} />
              <AmountCard label="Discount" value={formatPKR(discount)} />
              <AmountCard label="Paid" value={formatPKR(paidAmount)} />
              <AmountCard label="Balance" value={formatPKR(balance)} danger={balance > 0} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-200">
                    <SlipRow label="Fee Month" value={formatMonth(fee.fee_month)} />
                    <SlipRow label="Due Date" value={formatDate(fee.due_date)} />
                    <SlipRow label="Payment Date" value={formatDate(fee.paid_date)} />
                    <SlipRow label="Payment Method" value={fee.payment_method || "-"} />
                    <SlipRow label="Status" value={fee.status || "pending"} capitalize />
                    <SlipRow label="Net Payable" value={formatPKR(netAmount)} strong />
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 text-center">
                {academy?.payment_qr_url ? (
                  <img
                    src={academy.payment_qr_url}
                    alt="Payment QR"
                    className="mx-auto h-36 w-36 rounded-xl object-cover"
                  />
                ) : (
                  <div className="mx-auto grid h-36 w-36 place-items-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500">
                    Payment QR
                  </div>
                )}
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  Scan QR if academy has online payment enabled.
                </p>
              </div>
            </div>

            {fee.notes ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 print:bg-white">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{fee.notes}</p>
              </div>
            ) : null}

            <div className="mt-14 grid grid-cols-2 gap-10">
              <div className="border-t border-slate-400 pt-2 text-center text-sm font-semibold text-slate-600">
                Parent Signature
              </div>

              <div className="border-t border-slate-400 pt-2 text-center text-sm font-semibold text-slate-600">
                Admin Signature
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              This is a computer generated fee slip. Please keep it for your record.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={strong ? "mt-1 font-black text-slate-950" : "mt-1 font-semibold text-slate-800"}>{value}</p>
    </div>
  );
}

function AmountCard({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={danger ? "rounded-2xl border border-red-200 bg-red-50 p-4" : "rounded-2xl border border-slate-200 bg-white p-4"}>
      <p className={danger ? "text-xs font-bold uppercase text-red-600" : "text-xs font-bold uppercase text-slate-500"}>{label}</p>
      <p className={danger ? "mt-2 text-xl font-black text-red-700" : "mt-2 text-xl font-black text-slate-950"}>{value}</p>
    </div>
  );
}

function SlipRow({ label, value, strong = false, capitalize = false }: { label: string; value: string; strong?: boolean; capitalize?: boolean }) {
  return (
    <tr>
      <td className="bg-slate-50 px-4 py-3 font-bold text-slate-700 print:bg-white">{label}</td>
      <td className={`px-4 py-3 ${strong ? "font-black text-slate-950" : "font-semibold text-slate-800"} ${capitalize ? "capitalize" : ""}`}>{value}</td>
    </tr>
  );
}