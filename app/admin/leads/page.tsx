import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: string;
  student_name: string | null;
  phone: string | null;
  interested_class: string | null;
  subject_interest: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

async function updateStatus(id: string, formData: FormData) {
  "use server";

  const supabase = await createClient();

  await supabase
    .from("admission_leads")
    .update({
      status: String(formData.get("status") || "new"),
    })
    .eq("id", id);

  revalidatePath("/admin/leads");
}

async function deleteLead(id: string) {
  "use server";

  const supabase = await createClient();

  await supabase.from("admission_leads").delete().eq("id", id);

  revalidatePath("/admin/leads");
}

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  let leads: Lead[] = [];

  if (academy?.id) {
    const { data: leadsData } = await supabase
      .from("admission_leads")
      .select("*")
      .eq("academy_id", academy.id)
      .order("created_at", { ascending: false });

    leads = Array.isArray(leadsData) ? leadsData : [];
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Admission Leads
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Public admission form se aane wali inquiries yahan show hoti hain.
          </p>
        </div>
      </div>

      {!academy?.id ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-semibold">Academy settings missing</p>
          <p className="mt-1 text-sm">
            Pehle Settings page par academy information save karo.
          </p>
          <a
            href="/admin/settings"
            className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Settings
          </a>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {leads.map((lead) => (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            key={lead.id}
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">
                    {lead.student_name || "Unnamed Lead"}
                  </h2>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                    {lead.status || "new"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Phone: {lead.phone || "-"}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Class: {lead.interested_class || "-"} | Subject:{" "}
                  {lead.subject_interest || "-"}
                </p>

                <p className="mt-3 max-w-3xl rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {lead.message || "No message provided."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form
                  action={updateStatus.bind(null, lead.id)}
                  className="flex gap-2"
                >
                  <select
                    name="status"
                    defaultValue={lead.status || "new"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="trial booked">Trial Booked</option>
                    <option value="admitted">Admitted</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Update
                  </button>
                </form>

                <form action={deleteLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}

        {leads.length === 0 && academy?.id ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No leads yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}