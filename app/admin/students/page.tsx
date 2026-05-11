import Link from "next/link";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { formatPKR, makeStudentCode } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

function safeArray<T = any>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const query = (params.q || "").trim();
  const status = params.status || "all";

  const { supabase, academy } = await getCurrentUserAndAcademy();

  let students: any[] = [];
  let classes: any[] = [];
  let subjects: any[] = [];
  let teachers: any[] = [];
  let schedules: any[] = [];
  let loadError = "";

  // Guaranteed admin load: fetch direct tables without relying on fragile FK/embed queries.
  // RLS still protects the page because /admin layout requires login.
  let studentsRequest = supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    studentsRequest = studentsRequest.eq("status", status);
  }

  const [studentsRes, classesRes, subjectsRes, teachersRes, schedulesRes] =
    await Promise.all([
      studentsRequest,
      supabase.from("classes").select("id, class_name"),
      supabase.from("subjects").select("id, subject_name"),
      supabase.from("teachers").select("id, full_name, teacher_code"),
      supabase
        .from("class_schedules")
        .select("id, batch_name, start_time, end_time"),
    ]);

  if (studentsRes.error) {
    loadError = studentsRes.error.message;
  }

  students = safeArray(studentsRes.data);
  classes = safeArray(classesRes.data);
  subjects = safeArray(subjectsRes.data);
  teachers = safeArray(teachersRes.data);
  schedules = safeArray(schedulesRes.data);

  const classMap = new Map(classes.map((item: any) => [item.id, item]));
  const subjectMap = new Map(subjects.map((item: any) => [item.id, item]));
  const teacherMap = new Map(teachers.map((item: any) => [item.id, item]));
  const scheduleMap = new Map(schedules.map((item: any) => [item.id, item]));

  const filtered = query
    ? students.filter((student) => {
        const searchText = `${student.full_name || ""} ${student.father_name || ""} ${
          student.student_code || ""
        } ${makeStudentCode(student.id)} ${student.phone || ""} ${student.guardian_phone || ""}`.toLowerCase();

        return searchText.includes(query.toLowerCase());
      })
    : students;

  const activeCount = students.filter((student) => (student.status || "active") === "active").length;
  const inactiveCount = students.filter(
    (student) => student.status && student.status !== "active"
  ).length;
  const monthlyFeeTotal = students.reduce((sum, student) => {
    return sum + Number(student.monthly_fee || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            Student records, IDs, classes, teachers aur fee tracking yahan manage hoti hai.
          </p>
        </div>

        <Link
          href="/admin/students/new"
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Add Student
        </Link>
      </div>

      {!academy?.id ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Pehle Settings page par academy information save karo.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Students load error: {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Students" value={String(students.length)} />
        <SummaryCard title="Active Students" value={String(activeCount)} />
        <SummaryCard title="Inactive/Left" value={String(inactiveCount)} />
        <SummaryCard title="Monthly Fee Total" value={formatPKR(monthlyFeeTotal)} />
      </div>

      <form className="grid gap-3 rounded-3xl border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_140px]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, phone or Student ID..."
          className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        <select
          name="status"
          defaultValue={status}
          className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="left">Left</option>
        </select>

        <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Student ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Class</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Teacher / Timing</th>
                <th className="p-4">Parent Phone</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td className="p-5 text-slate-500" colSpan={9}>
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const studentCode = student.student_code || makeStudentCode(student.id);
                  const classInfo = classMap.get(student.class_id);
                  const subjectInfo = subjectMap.get(student.subject_id);
                  const teacherInfo = teacherMap.get(student.teacher_id);
                  const scheduleInfo = scheduleMap.get(student.schedule_id);
                  const timingText = scheduleInfo?.start_time
                    ? `${scheduleInfo.start_time} - ${scheduleInfo.end_time || ""}`
                    : scheduleInfo?.batch_name || "-";

                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-xs font-bold text-blue-700">
                        {studentCode}
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="font-semibold text-slate-950 hover:text-blue-600"
                        >
                          {student.full_name || "Unnamed Student"}
                        </Link>
                        <p className="text-xs text-slate-500">
                          Father: {student.father_name || "-"}
                        </p>
                      </td>

                      <td className="p-4">{classInfo?.class_name || "-"}</td>
                      <td className="p-4">{subjectInfo?.subject_name || "-"}</td>

                      <td className="p-4">
                        {teacherInfo?.full_name || "-"}
                        <p className="text-xs text-slate-500">{timingText}</p>
                      </td>

                      <td className="p-4">{student.guardian_phone || student.phone || "-"}</td>
                      <td className="p-4">{formatPKR(Number(student.monthly_fee || 0))}</td>

                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">
                          {student.status || "active"}
                        </span>
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          View Details
                        </Link>
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

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
