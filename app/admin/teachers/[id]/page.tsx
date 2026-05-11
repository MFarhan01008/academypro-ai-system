import Link from "next/link";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { formatPKR, shortId } from "@/lib/utils";

export default async function TeacherDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy) {
    return <p>Missing academy</p>;
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .eq("academy_id", academy.id)
    .maybeSingle();

  if (!teacher) {
    return <p>Teacher not found</p>;
  }

  const [stRes, schRes, salRes, feeRes] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("academy_id", academy.id)
      .eq("teacher_id", id),
    supabase
      .from("class_schedules")
      .select("*, classes(class_name), subjects(subject_name)")
      .eq("academy_id", academy.id)
      .eq("teacher_id", id),
    supabase
      .from("teacher_salaries")
      .select("*")
      .eq("academy_id", academy.id)
      .eq("teacher_id", id)
      .order("salary_month", { ascending: false }),
    supabase
      .from("fees")
      .select("*")
      .eq("academy_id", academy.id)
      .eq("teacher_id", id),
  ]);

  const students = Array.isArray(stRes.data) ? stRes.data : [];
  const schedules = Array.isArray(schRes.data) ? schRes.data : [];
  const salaries = Array.isArray(salRes.data) ? salRes.data : [];
  const fees = Array.isArray(feeRes.data) ? feeRes.data : [];

  const collected = fees.reduce((total: number, fee: any) => {
    return total + Number(fee.paid_amount || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
            {teacher.photo_url ? (
              <img
                src={teacher.photo_url}
                alt={teacher.full_name || "Teacher"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-500">
                T
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black">{teacher.full_name}</h1>
            <p className="text-sm font-bold text-blue-700">
              {teacher.teacher_code || shortId("TCH", teacher.id)} • {" "}
              {teacher.subject_specialty || "Teacher"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/teachers/${id}/edit`}
            className="rounded-2xl border px-4 py-2 text-sm font-bold"
          >
            Edit
          </Link>

          <Link
            href={`/admin/teachers/${id}/salary`}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Add Salary
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card t="Students" v={String(students.length)} />
        <Card t="Classes" v={String(schedules.length)} />
        <Card t="Fee Collected" v={formatPKR(collected)} />
        <Card t="Salary" v={formatPKR(teacher.monthly_salary)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-black">Private Admin Details</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <b>Phone:</b> {teacher.phone || "-"}
            </p>
            <p>
              <b>WhatsApp:</b> {teacher.whatsapp || "-"}
            </p>
            <p>
              <b>CNIC:</b> {teacher.cnic || "-"}
            </p>
            <p>
              <b>Address:</b> {teacher.address || "-"}
            </p>
            <p>
              <b>Qualification:</b> {teacher.qualification || "-"}
            </p>
            <p>
              <b>Experience:</b> {teacher.experience_years || 0} years
            </p>
            <p>
              <b>Bio:</b> {teacher.bio || "-"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-black">Assigned Classes</h2>
          <div className="mt-4 divide-y rounded-xl border">
            {schedules.length ? (
              schedules.map((schedule: any) => (
                <div key={schedule.id} className="p-4 text-sm">
                  <b>{schedule.classes?.class_name || "-"}</b> • {" "}
                  {schedule.subjects?.subject_name || "-"} • {" "}
                  {schedule.start_time || "-"}-{schedule.end_time || "-"}
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">No schedules.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-black">Students in Teacher Classes</h2>
          <div className="mt-4 divide-y rounded-xl border">
            {students.length ? (
              students.map((student: any) => (
                <div key={student.id} className="p-4 text-sm">
                  <b className="text-blue-700">
                    {student.student_code || shortId("STU", student.id)}
                  </b>{" "}
                  • {student.full_name} • {formatPKR(student.monthly_fee)}
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">No students assigned.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-black">Salary History</h2>
          <div className="mt-4 divide-y rounded-xl border">
            {salaries.length ? (
              salaries.map((salary: any) => (
                <div key={salary.id} className="p-4 text-sm">
                  {salary.salary_month} • Base {formatPKR(salary.base_salary)} • Paid {" "}
                  {formatPKR(salary.paid_amount)} • {salary.status || "pending"}
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">No salary records.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ t, v }: { t: string; v: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-slate-500">{t}</p>
      <p className="mt-2 text-2xl font-black">{v}</p>
    </div>
  );
}
