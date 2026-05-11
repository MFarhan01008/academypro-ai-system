import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { formatPKR, shortId } from "@/lib/utils";

async function toggle(formData: FormData) {
  "use server";

  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy) {
    throw new Error("Missing academy");
  }

  const id = String(formData.get("id") || "");
  const currentStatus = String(formData.get("status") || "active");
  const status = currentStatus === "active" ? "inactive" : "active";

  const { error } = await supabase
    .from("teachers")
    .update({ status })
    .eq("id", id)
    .eq("academy_id", academy.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/teachers");
}

export default async function TeachersPage() {
  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy) {
    return <p>Save settings first.</p>;
  }

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("academy_id", academy.id)
    .order("created_at", { ascending: false });

  const teachers = Array.isArray(data) ? data : [];

  if (error) {
    return (
      <div className="rounded-2xl border bg-amber-50 p-6">
        Run <b>supabase/teacher-upgrade.sql</b> in Supabase SQL Editor first.
        <p className="mt-2 text-sm text-amber-700">{error.message}</p>
      </div>
    );
  }

  const activeTeachers = teachers.filter((teacher: any) => {
    return teacher.status === "active";
  }).length;

  const payroll = teachers.reduce((total: number, teacher: any) => {
    return total + Number(teacher.monthly_salary || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black">Teachers</h1>
          <p className="text-sm text-slate-600">
            Add, edit, deactivate, salary, public visibility and teacher tracking.
          </p>
        </div>

        <Link
          href="/admin/teachers/new"
          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
        >
          Add Teacher
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card t="Total Teachers" v={String(teachers.length)} />
        <Card t="Active Teachers" v={String(activeTeachers)} />
        <Card t="Monthly Payroll" v={formatPKR(payroll)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4">Photo</th>
              <th className="px-5 py-4">Teacher ID</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Subject</th>
              <th className="px-5 py-4">Experience</th>
              <th className="px-5 py-4">Salary</th>
              <th className="px-5 py-4">Public</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {teachers.map((teacher: any) => (
              <tr key={teacher.id}>
                <td className="px-5 py-4">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                    {teacher.photo_url ? (
                      <img
                        src={teacher.photo_url}
                        alt={teacher.full_name || "Teacher"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                        T
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-5 py-4 font-bold text-blue-700">
                  {teacher.teacher_code || shortId("TCH", teacher.id)}
                </td>

                <td className="px-5 py-4 font-bold">
                  {teacher.full_name || "Unnamed Teacher"}
                </td>

                <td className="px-5 py-4">{teacher.subject_specialty || "-"}</td>
                <td className="px-5 py-4">{teacher.experience_years || 0} yrs</td>
                <td className="px-5 py-4">{formatPKR(teacher.monthly_salary)}</td>
                <td className="px-5 py-4">{teacher.public_visible ? "Visible" : "Hidden"}</td>
                <td className="px-5 py-4">{teacher.status || "active"}</td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                      href={`/admin/teachers/${teacher.id}`}
                    >
                      View
                    </Link>

                    <Link
                      className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                      href={`/admin/teachers/${teacher.id}/edit`}
                    >
                      Edit
                    </Link>

                    <form action={toggle}>
                      <input type="hidden" name="id" value={teacher.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={teacher.status || "active"}
                      />
                      <button className="rounded-lg border px-3 py-1.5 text-xs font-bold">
                        Toggle
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {teachers.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No teachers yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function Card({ t, v }: { t: string; v: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{t}</p>
      <p className="mt-2 text-2xl font-black">{v}</p>
    </div>
  );
}
