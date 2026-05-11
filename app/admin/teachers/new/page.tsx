import { redirect } from "next/navigation";
import { getCurrentUserAndAcademy } from "@/lib/admin-data";
import { TeacherPhotoUpload } from "@/components/admin/TeacherPhotoUpload";

async function createTeacher(formData: FormData) {
  "use server";

  const { supabase, academy } = await getCurrentUserAndAcademy();

  if (!academy) {
    throw new Error("Missing academy");
  }

  const { error } = await supabase.from("teachers").insert({
    academy_id: academy.id,
    full_name: String(formData.get("full_name") || ""),
    father_name: String(formData.get("father_name") || "") || null,
    photo_url: String(formData.get("photo_url") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    whatsapp: String(formData.get("whatsapp") || "") || null,
    cnic: String(formData.get("cnic") || "") || null,
    address: String(formData.get("address") || "") || null,
    qualification: String(formData.get("qualification") || "") || null,
    experience_years: Number(formData.get("experience_years") || 0),
    subject_specialty: String(formData.get("subject_specialty") || "") || null,
    bio: String(formData.get("bio") || "") || null,
    joining_date: String(formData.get("joining_date") || "") || null,
    monthly_salary: Number(formData.get("monthly_salary") || 0),
    status: String(formData.get("status") || "active"),
    public_visible: formData.get("public_visible") === "on",
    featured: formData.get("featured") === "on",
    notes: String(formData.get("notes") || "") || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/admin/teachers");
}

export default function NewTeacherPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Add Teacher</h1>
      <TeacherForm action={createTeacher} />
    </div>
  );
}

function TeacherForm({ action, defaults = {} }: any) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"
    >
      <F n="full_name" l="Full name" r d={defaults.full_name || ""} />
      <F n="father_name" l="Father name" d={defaults.father_name || ""} />

      <TeacherPhotoUpload defaultUrl={defaults.photo_url || ""} />

      <F n="phone" l="Phone" d={defaults.phone || ""} />
      <F n="whatsapp" l="WhatsApp" d={defaults.whatsapp || ""} />
      <F n="cnic" l="CNIC" d={defaults.cnic || ""} />
      <F n="qualification" l="Qualification" d={defaults.qualification || ""} />
      <F
        n="experience_years"
        l="Experience years"
        t="number"
        d={defaults.experience_years || 0}
      />
      <F
        n="subject_specialty"
        l="Subject specialty"
        d={defaults.subject_specialty || ""}
      />
      <F
        n="monthly_salary"
        l="Monthly salary"
        t="number"
        d={defaults.monthly_salary || 0}
      />
      <F n="joining_date" l="Joining date" t="date" d={defaults.joining_date || ""} />

      <label className="text-sm font-semibold">
        Status
        <select
          name="status"
          defaultValue={defaults.status || "active"}
          className="mt-1 w-full rounded-xl border px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="left">Left</option>
        </select>
      </label>

      <TA n="address" l="Address" d={defaults.address || ""} />
      <TA n="bio" l="Public bio" d={defaults.bio || ""} />
      <TA n="notes" l="Internal notes" d={defaults.notes || ""} />

      <div className="md:col-span-2 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="public_visible"
            defaultChecked={defaults.public_visible ?? true}
          />
          Show on public website
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={defaults.featured || false}
          />
          Featured
        </label>
      </div>

      <button className="w-fit rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
        Save Teacher
      </button>
    </form>
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
    <label className="text-sm font-semibold">
      {l}
      <input
        name={n}
        type={t}
        required={r}
        defaultValue={d}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function TA({ n, l, d = "" }: { n: string; l: string; d?: string }) {
  return (
    <label className="md:col-span-2 text-sm font-semibold">
      {l}
      <textarea
        name={n}
        rows={3}
        defaultValue={d}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}
