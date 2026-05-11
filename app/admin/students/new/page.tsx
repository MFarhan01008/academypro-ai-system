import { redirect } from "next/navigation";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";

async function addStudent(formData: FormData) {
  "use server";

  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy?.id) {
    throw new Error("Create academy settings first");
  }

  const { error } = await supabase.from("students").insert({
    academy_id: academy.id,
    full_name: String(formData.get("full_name") || "").trim(),
    father_name: String(formData.get("father_name") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    guardian_phone: String(formData.get("guardian_phone") || "").trim() || null,
    class_id: String(formData.get("class_id") || "") || null,
    subject_id: String(formData.get("subject_id") || "") || null,
    teacher_id: String(formData.get("teacher_id") || "") || null,
    schedule_id: String(formData.get("schedule_id") || "") || null,
    monthly_fee: Number(formData.get("monthly_fee") || 0),
    admission_date:
      String(formData.get("admission_date") || "") ||
      new Date().toISOString().slice(0, 10),
    status: String(formData.get("status") || "active"),
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/admin/students");
}

export default async function NewStudent() {
  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy?.id) {
    redirect("/admin/settings");
  }

  const [classesRes, subjectsRes, teachersRes, schedulesRes] = await Promise.all([
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
      .eq("status", "active")
      .order("full_name", { ascending: true }),
    supabase
      .from("class_schedules")
      .select("id, batch_name, start_time, end_time, monthly_fee, classes(class_name), teachers(full_name)")
      .eq("academy_id", academy.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const classes = Array.isArray(classesRes.data) ? classesRes.data : [];
  const subjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
  const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
  const schedules = Array.isArray(schedulesRes.data) ? schedulesRes.data : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Add Student</h1>
        <p className="mt-1 text-sm text-slate-500">
          Student ko class, subject, teacher aur batch/timing ke saath register karo.
        </p>
      </div>

      <form action={addStudent} className="grid gap-6 rounded-3xl border bg-white p-6 shadow-sm lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Student Information</h2>

          <F n="full_name" l="Student name" r />
          <F n="father_name" l="Father name" />
          <F n="phone" l="Student phone" />
          <F n="guardian_phone" l="Parent/Guardian phone" />
          <F n="admission_date" l="Admission date" t="date" d={new Date().toISOString().slice(0, 10)} />
          <F n="monthly_fee" l="Monthly fee" t="number" d={academy.default_monthly_fee || 0} />

          <label className="block text-sm font-semibold text-slate-700">
            Status
            <select name="status" defaultValue="active" className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="left">Left</option>
            </select>
          </label>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Class, Teacher & Timing</h2>

          <Select n="class_id" l="Class" items={classes} labelKey="class_name" />
          <Select n="subject_id" l="Subject" items={subjects} labelKey="subject_name" />
          <Select n="teacher_id" l="Teacher" items={teachers} labelKey="full_name" />

          <label className="block text-sm font-semibold text-slate-700">
            Schedule / Batch
            <select name="schedule_id" className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
              <option value="">Select schedule</option>
              {schedules.map((schedule: any) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.classes?.class_name || "Class"} • {schedule.teachers?.full_name || "Teacher"} • {schedule.batch_name || "Regular"} • {schedule.start_time || "?"}-{schedule.end_time || "?"}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Student save hone ke baad system uska ID show karega, jese STU-A1B2C3. Us ID se fee aur history track hogi.
          </div>

          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
            Save Student
          </button>
        </section>
      </form>
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
}: {
  n: string;
  l: string;
  items: any[];
  labelKey: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {l}
      <select name={n} className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm">
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
