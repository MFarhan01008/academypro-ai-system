import { redirect } from "next/navigation";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { currentMonthStart } from "@/lib/utils";

export default async function SalaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy) {
    redirect("/admin/settings");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .eq("academy_id", academy.id)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";

    const { supabase, academy } = await getCurrentUserAndAcademy();

    if (!academy) {
      throw new Error("Missing academy");
    }

    const paid = Number(formData.get("paid_amount") || 0);
    const base = Number(formData.get("base_salary") || 0);

    const { error } = await supabase.from("teacher_salaries").insert({
      academy_id: academy.id,
      teacher_id: id,
      salary_month: String(formData.get("salary_month") || currentMonthStart()),
      base_salary: base,
      bonus_amount: Number(formData.get("bonus_amount") || 0),
      deduction_amount: Number(formData.get("deduction_amount") || 0),
      paid_amount: paid,
      status: paid >= base ? "paid" : paid > 0 ? "partial" : "pending",
      paid_date: String(formData.get("paid_date") || "") || null,
      payment_method: String(formData.get("payment_method") || "cash"),
      notes: String(formData.get("notes") || "") || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/admin/teachers/${id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">
        Add Salary - {teacher?.full_name || "Teacher"}
      </h1>

      <form
        action={save}
        className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"
      >
        <F n="salary_month" l="Salary month" t="date" d={currentMonthStart()} />
        <F
          n="base_salary"
          l="Base salary"
          t="number"
          d={teacher?.monthly_salary || 0}
        />
        <F n="bonus_amount" l="Bonus" t="number" d="0" />
        <F n="deduction_amount" l="Deduction" t="number" d="0" />
        <F
          n="paid_amount"
          l="Paid amount"
          t="number"
          d={teacher?.monthly_salary || 0}
        />
        <F n="paid_date" l="Paid date" t="date" />

        <label className="text-sm font-semibold">
          Payment method
          <select
            name="payment_method"
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="jazzcash">JazzCash</option>
          </select>
        </label>

        <label className="md:col-span-2 text-sm font-semibold">
          Notes
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>

        <button className="w-fit rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
          Save Salary
        </button>
      </form>
    </div>
  );
}

function F({ n, l, t = "text", d = "" }: any) {
  return (
    <label className="text-sm font-semibold">
      {l}
      <input
        name={n}
        type={t}
        defaultValue={d}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}
