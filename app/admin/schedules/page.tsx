import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatPKR(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours || 0));
  date.setMinutes(Number(minutes || 0));

  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SchedulesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Class Schedules</h1>
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
        <h1 className="text-2xl font-bold text-slate-950">Class Schedules</h1>

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

  const { data: schedulesData, error: schedulesError } = await supabase
    .from("class_schedules")
    .select("*")
    .eq("academy_id", academy.id)
    .order("created_at", { ascending: false });

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, class_name")
    .eq("academy_id", academy.id);

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, subject_name")
    .eq("academy_id", academy.id);

  const { data: teachersData } = await supabase
    .from("teachers")
    .select("id, teacher_code, full_name")
    .eq("academy_id", academy.id);

  const schedules = Array.isArray(schedulesData) ? schedulesData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  const teachers = Array.isArray(teachersData) ? teachersData : [];

  const classMap = new Map(classes.map((item: any) => [item.id, item]));
  const subjectMap = new Map(subjects.map((item: any) => [item.id, item]));
  const teacherMap = new Map(teachers.map((item: any) => [item.id, item]));

  const activeSchedules = schedules.filter((schedule: any) => {
    return schedule.status === "active";
  }).length;

  const inactiveSchedules = schedules.filter((schedule: any) => {
    return schedule.status !== "active";
  }).length;

  if (schedulesError) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Class Schedules</h1>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-semibold">Schedule table not ready</p>
          <p className="mt-1 text-sm">
            Supabase SQL Editor mein{" "}
            <strong>supabase/teacher-upgrade.sql</strong> run karo.
          </p>
          <p className="mt-3 text-xs">{schedulesError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Class Schedules
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Class, subject, teacher, batch aur timing yahan manage hoti hai.
          </p>
        </div>

        <Link
          href="/admin/schedules/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Schedule
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Schedules" value={String(schedules.length)} />
        <SummaryCard title="Active Schedules" value={String(activeSchedules)} />
        <SummaryCard
          title="Inactive Schedules"
          value={String(inactiveSchedules)}
        />
        <SummaryCard title="Teachers Linked" value={String(teachers.length)} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">
            Schedule Records
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Har batch ke saath teacher, subject aur time attach hota hai.
          </p>
        </div>

        {schedules.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            Abhi koi schedule nahi hai. Pehla class schedule add karo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Class</th>
                  <th className="px-5 py-3 font-semibold">Subject</th>
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Batch</th>
                  <th className="px-5 py-3 font-semibold">Days</th>
                  <th className="px-5 py-3 font-semibold">Timing</th>
                  <th className="px-5 py-3 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {schedules.map((schedule: any) => {
                  const classInfo = classMap.get(schedule.class_id);
                  const subjectInfo = subjectMap.get(schedule.subject_id);
                  const teacherInfo = teacherMap.get(schedule.teacher_id);

                  return (
                    <tr key={schedule.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {classInfo?.class_name || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {subjectInfo?.subject_name || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">
                          {teacherInfo?.full_name || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {teacherInfo?.teacher_code || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {schedule.batch_name || "Regular Batch"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {schedule.days || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatTime(schedule.start_time)} -{" "}
                        {formatTime(schedule.end_time)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPKR(Number(schedule.monthly_fee || 0))}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {schedule.room || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                          {schedule.status || "active"}
                        </span>
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