import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatPKR(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

export default async function SalariesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Teacher Salaries</h1>
        <p className="mt-2 text-sm text-red-600">Please login first.</p>
      </div>
    );
  }

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!academy?.id) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Teacher Salaries</h1>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-semibold">Academy settings missing</p>
          <p className="mt-1 text-sm">
            Pehle Settings page par academy information save karo.
          </p>

          <Link
            href="/admin/settings"
            className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  const { data: salariesData, error: salariesError } = await supabase
    .from("teacher_salaries")
    .select("*")
    .eq("academy_id", academy.id)
    .order("salary_month", { ascending: false });

  const { data: teachersData } = await supabase
    .from("teachers")
    .select("id, teacher_code, full_name")
    .eq("academy_id", academy.id);

  const salaries = Array.isArray(salariesData) ? salariesData : [];
  const teachers = Array.isArray(teachersData) ? teachersData : [];

  const teacherMap = new Map(
    teachers.map((teacher: any) => [teacher.id, teacher])
  );

  const totalBaseSalary = salaries.reduce((total: number, salary: any) => {
    return total + Number(salary.base_salary || 0);
  }, 0);

  const totalPaid = salaries.reduce((total: number, salary: any) => {
    return total + Number(salary.paid_amount || 0);
  }, 0);

  const totalPending = salaries.reduce((total: number, salary: any) => {
    const base = Number(salary.base_salary || 0);
    const bonus = Number(salary.bonus_amount || 0);
    const deduction = Number(salary.deduction_amount || 0);
    const paid = Number(salary.paid_amount || 0);

    return total + Math.max(base + bonus - deduction - paid, 0);
  }, 0);

  const paidCount = salaries.filter((salary: any) => {
    return salary.status === "paid";
  }).length;

  const pendingCount = salaries.filter((salary: any) => {
    return salary.status !== "paid" && salary.status !== "cancelled";
  }).length;

  if (salariesError) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Teacher Salaries</h1>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-semibold">Salary table not ready</p>
          <p className="mt-1 text-sm">
            Supabase SQL Editor mein{" "}
            <strong>supabase/teacher-upgrade.sql</strong> run karo.
          </p>
          <p className="mt-3 text-xs">{salariesError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Teacher Salaries
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Teacher monthly salary, paid amount, pending amount aur salary
            history.
          </p>
        </div>

        <Link
          href="/admin/teachers"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Manage Teachers
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Base Salary" value={formatPKR(totalBaseSalary)} />
        <SummaryCard title="Total Paid" value={formatPKR(totalPaid)} />
        <SummaryCard title="Total Pending" value={formatPKR(totalPending)} />
        <SummaryCard title="Pending Records" value={String(pendingCount)} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">Salary Records</h2>
          <p className="mt-1 text-sm text-slate-600">
            Paid records: {paidCount} | Total records: {salaries.length}
          </p>
        </div>

        {salaries.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            Abhi koi salary record nahi hai. Teacher detail page se salary entry
            add karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Month</th>
                  <th className="px-5 py-3 font-semibold">Base Salary</th>
                  <th className="px-5 py-3 font-semibold">Bonus</th>
                  <th className="px-5 py-3 font-semibold">Deduction</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Pending</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Paid Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {salaries.map((salary: any) => {
                  const teacher = teacherMap.get(salary.teacher_id);
                  const base = Number(salary.base_salary || 0);
                  const bonus = Number(salary.bonus_amount || 0);
                  const deduction = Number(salary.deduction_amount || 0);
                  const paid = Number(salary.paid_amount || 0);
                  const pending = Math.max(base + bonus - deduction - paid, 0);

                  return (
                    <tr key={salary.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {teacher?.full_name || "Unknown Teacher"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {teacher?.teacher_code || salary.teacher_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatMonth(salary.salary_month)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPKR(base)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPKR(bonus)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPKR(deduction)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPKR(paid)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {formatPKR(pending)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                          {salary.status || "pending"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(salary.paid_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}