import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { createFeeReminderMessage, createWhatsAppLink } from "@/lib/whatsapp";
import { formatDate, formatMonth, formatPKR, makeStudentCode } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function safeArray<T = any>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

async function updateStudent(id: string, formData: FormData) {
  "use server";

  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy?.id) {
    throw new Error("Missing academy");
  }

  const { error } = await supabase
    .from("students")
    .update({
      full_name: String(formData.get("full_name") || "").trim(),
      father_name: String(formData.get("father_name") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      guardian_phone: String(formData.get("guardian_phone") || "").trim() || null,
      class_id: String(formData.get("class_id") || "") || null,
      subject_id: String(formData.get("subject_id") || "") || null,
      teacher_id: String(formData.get("teacher_id") || "") || null,
      schedule_id: String(formData.get("schedule_id") || "") || null,
      monthly_fee: Number(formData.get("monthly_fee") || 0),
      admission_date: String(formData.get("admission_date") || "") || null,
      status: String(formData.get("status") || "active"),
    })
    .eq("id", id)
    .eq("academy_id", academy.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/students/${id}`);
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy?.id) {
    redirect("/admin/settings");
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("academy_id", academy.id)
    .maybeSingle();

  if (!student) {
    return (
      <div className="space-y-4">
        <Link href="/admin/students" className="text-sm font-bold text-blue-700">
          ← Back to Students
        </Link>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Student not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            {studentError?.message || "Ye student record nahi mila ya is academy mein access available nahi."}
          </p>
        </div>
      </div>
    );
  }

  const [feesRes, classesRes, subjectsRes, teachersRes, schedulesRes] = await Promise.all([
    supabase
      .from("fees")
      .select("*")
      .eq("academy_id", academy.id)
      .eq("student_id", id)
      .order("fee_month", { ascending: false }),
    supabase
      .from("classes")
      .select("id, class_name")
      .eq("academy_id", academy.id)
      .order("class_name", { ascending: true }),
    supabase
      .from("subjects")
      .select("id, subject_name")
      .eq("academy_id", academy.id)
      .order("subject_name", { ascending: true }),
    supabase
      .from("teachers")
      .select("id, full_name, teacher_code")
      .eq("academy_id", academy.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("class_schedules")
      .select("id, batch_name, start_time, end_time, monthly_fee")
      .eq("academy_id", academy.id)
      .order("created_at", { ascending: false }),
  ]);

  const fees = safeArray(feesRes.data);
  const classes = safeArray(classesRes.data);
  const subjects = safeArray(subjectsRes.data);
  const teachers = safeArray(teachersRes.data);
  const schedules = safeArray(schedulesRes.data);

  const classMap = new Map(classes.map((item: any) => [item.id, item]));
  const subjectMap = new Map(subjects.map((item: any) => [item.id, item]));
  const teacherMap = new Map(teachers.map((item: any) => [item.id, item]));
  const scheduleMap = new Map(schedules.map((item: any) => [item.id, item]));

  const classInfo: any = classMap.get(student.class_id);
  const subjectInfo: any = subjectMap.get(student.subject_id);
  const teacherInfo: any = teacherMap.get(student.teacher_id);
  const scheduleInfo: any = scheduleMap.get(student.schedule_id);

  const totalDue = fees.reduce((sum, fee: any) => sum + Number(fee.amount_due || fee.amount || 0), 0);
  const totalDiscount = fees.reduce((sum, fee: any) => sum + Number(fee.discount_amount || 0), 0);
  const totalPaid = fees.reduce((sum, fee: any) => sum + Number(fee.paid_amount || 0), 0);
  const totalPending = fees.reduce((sum, fee: any) => {
    return sum + Math.max(Number(fee.amount_due || fee.amount || 0) - Number(fee.discount_amount || 0) - Number(fee.paid_amount || 0), 0);
  }, 0);
  const paidCount = fees.filter((fee: any) => fee.status === "paid").length;
  const unpaidCount = fees.filter((fee: any) => fee.status !== "paid").length;

  const studentCode = student.student_code || makeStudentCode(student.id);
  const scheduleText = scheduleInfo?.start_time
    ? `${scheduleInfo.batch_name || "Regular"} • ${scheduleInfo.start_time} - ${scheduleInfo.end_time || ""}`
    : scheduleInfo?.batch_name || "-";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link href="/admin/students" className="text-sm font-bold text-blue-700">
            ← Back to Students
          </Link>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{student.full_name}</h1>
          <p className="mt-1 font-mono text-sm font-bold text-blue-700">{studentCode}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/fees/new"
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Add Fee Entry
          </Link>
          {student.guardian_phone ? (
            <a
              href={createWhatsAppLink(
                student.guardian_phone,
                createFeeReminderMessage({
                  studentName: student.full_name || "Student",
                  month: "current month",
                  academyName: academy.academy_name || "Academy",
                })
              )}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              WhatsApp Parent
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Due" value={formatPKR(totalDue)} />
        <SummaryCard title="Total Paid" value={formatPKR(totalPaid)} />
        <SummaryCard title="Total Pending" value={formatPKR(totalPending)} />
        <SummaryCard title="Fee Records" value={String(fees.length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Student Profile</h2>
              <p className="mt-1 text-sm text-slate-500">Basic information, class, teacher aur batch details.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
              {student.status || "active"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Father name" value={student.father_name || "-"} />
            <Info label="Student phone" value={student.phone || "-"} />
            <Info label="Parent phone" value={student.guardian_phone || "-"} />
            <Info label="Class" value={classInfo?.class_name || "-"} />
            <Info label="Subject" value={subjectInfo?.subject_name || "-"} />
            <Info label="Teacher" value={teacherInfo?.full_name || "-"} />
            <Info label="Batch / timing" value={scheduleText} />
            <Info label="Monthly fee" value={formatPKR(Number(student.monthly_fee || 0))} />
            <Info label="Admission date" value={formatDate(student.admission_date)} />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Fee Summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryRow label="Paid months" value={String(paidCount)} />
            <SummaryRow label="Unpaid / due months" value={String(unpaidCount)} />
            <SummaryRow label="Total discount" value={formatPKR(totalDiscount)} />
            <SummaryRow label="Pending amount" value={formatPKR(totalPending)} strong />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-black text-slate-950">Full Fee History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Student ki paid, unpaid, partial aur due entries yahan track hoti hain.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Month</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Date</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {fees.length === 0 ? (
                <tr>
                  <td className="p-5 text-slate-500" colSpan={9}>
                    Abhi is student ki koi fee entry nahi hai.
                  </td>
                </tr>
              ) : (
                fees.map((fee: any) => {
                  const amount = Number(fee.amount_due || fee.amount || 0);
                  const discount = Number(fee.discount_amount || 0);
                  const paid = Number(fee.paid_amount || 0);
                  const balance = Math.max(amount - discount - paid, 0);
                  const message = createFeeReminderMessage({
                    studentName: student.full_name || "Student",
                    month: formatMonth(fee.fee_month),
                    academyName: academy.academy_name || "Academy",
                  });

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-950">{formatMonth(fee.fee_month)}</td>
                      <td className="p-4">{formatPKR(amount)}</td>
                      <td className="p-4">{formatPKR(discount)}</td>
                      <td className="p-4">{formatPKR(paid)}</td>
                      <td className="p-4 font-semibold text-slate-950">{formatPKR(balance)}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">
                          {fee.status || "pending"}
                        </span>
                      </td>
                      <td className="p-4 capitalize">{fee.payment_method || "-"}</td>
                      <td className="p-4">{formatDate(fee.paid_date)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/fees/${fee.id}/slip`}
                            className="rounded-xl border px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            Print Slip
                          </Link>
                          {fee.status !== "paid" && student.guardian_phone ? (
                            <a
                              href={createWhatsAppLink(student.guardian_phone, message)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
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
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Quick Edit Student</h2>
        <p className="mt-1 text-sm text-slate-500">
          Basic profile, class, teacher aur timing update karo.
        </p>

        <form action={updateStudent.bind(null, id)} className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <F n="full_name" l="Student name" d={student.full_name || ""} r />
          <F n="father_name" l="Father name" d={student.father_name || ""} />
          <F n="phone" l="Student phone" d={student.phone || ""} />
          <F n="guardian_phone" l="Parent phone" d={student.guardian_phone || ""} />
          <F n="monthly_fee" l="Monthly fee" t="number" d={student.monthly_fee || 0} />
          <F n="admission_date" l="Admission date" t="date" d={student.admission_date || ""} />
          <Select n="class_id" l="Class" items={classes} labelKey="class_name" defaultValue={student.class_id || ""} />
          <Select n="subject_id" l="Subject" items={subjects} labelKey="subject_name" defaultValue={student.subject_id || ""} />
          <Select n="teacher_id" l="Teacher" items={teachers} labelKey="full_name" defaultValue={student.teacher_id || ""} />

          <label className="block text-sm font-semibold text-slate-700">
            Schedule
            <select name="schedule_id" defaultValue={student.schedule_id || ""} className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
              <option value="">Select schedule</option>
              {schedules.map((schedule: any) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.batch_name || "Regular"} • {schedule.start_time || "?"}-{schedule.end_time || "?"}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Status
            <select name="status" defaultValue={student.status || "active"} className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="left">Left</option>
            </select>
          </label>

          <div className="md:col-span-2 lg:col-span-3">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
              Update Student
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-slate-600">{label}</span>
      <span className={strong ? "font-black text-slate-950" : "font-bold text-slate-950"}>{value}</span>
    </div>
  );
}

function F({
  n,
  l,
  t = "text",
  r = false,
  d = "",
}: {
  n: string;
  l: string;
  t?: string;
  r?: boolean;
  d?: string | number;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {l}
      <input
        name={n}
        type={t}
        required={r}
        defaultValue={d}
        className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm"
      />
    </label>
  );
}

function Select({
  n,
  l,
  items,
  labelKey,
  defaultValue = "",
}: {
  n: string;
  l: string;
  items: any[];
  labelKey: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {l}
      <select name={n} defaultValue={defaultValue} className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
        <option value="">Select {l}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item[labelKey]}
          </option>
        ))}
      </select>
    </label>
  );
}
