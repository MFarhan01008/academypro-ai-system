import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAcademyId() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  return academy?.id ?? null;
}

async function addClass(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const academyId = await getAcademyId();

  if (!academyId) {
    throw new Error("Academy settings not found. Please create academy settings first.");
  }

  const className = String(formData.get("class_name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const defaultMonthlyFee = Number(formData.get("default_monthly_fee") || 0);

  if (!className) {
    throw new Error("Class name is required.");
  }

  const { error } = await supabase.from("classes").insert({
    academy_id: academyId,
    class_name: className,
    description,
    default_monthly_fee: defaultMonthlyFee,
    status: "active",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/classes");
}

async function deleteClass(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const academyId = await getAcademyId();

  if (!academyId) {
    throw new Error("Academy settings not found.");
  }

  const id = String(formData.get("id") || "");

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("academy_id", academyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/classes");
}

async function toggleClassStatus(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const academyId = await getAcademyId();

  if (!academyId) {
    throw new Error("Academy settings not found.");
  }

  const id = String(formData.get("id") || "");
  const currentStatus = String(formData.get("status") || "active");

  const newStatus = currentStatus === "active" ? "inactive" : "active";

  const { error } = await supabase
    .from("classes")
    .update({
      status: newStatus,
    })
    .eq("id", id)
    .eq("academy_id", academyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/classes");
}

export default async function ClassesPage() {
  const supabase = await createClient();
  const academyId = await getAcademyId();

  if (!academyId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Classes</h1>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-semibold">Academy settings missing</p>
          <p className="mt-1 text-sm">
            Pehle Settings page par ja kar academy information save karo.
          </p>
          <a
            href="/admin/settings"
            className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  const { data: classes, error } = await supabase
    .from("classes")
    .select("*")
    .eq("academy_id", academyId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Classes</h1>
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Classes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Yahan academy ki classes/courses add karo.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Add New Class</h2>

        <form action={addClass} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Class/Course Name
            </label>
            <input
              name="class_name"
              placeholder="Example: 10th Class"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Default Monthly Fee
            </label>
            <input
              name="default_monthly_fee"
              type="number"
              defaultValue="0"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              name="description"
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Class
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-slate-950">Class List</h2>
        </div>

        {!classes || classes.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">
            Abhi koi class add nahi hui.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Monthly Fee</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-medium text-slate-950">
                      {item.class_name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.description || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      Rs. {Number(item.default_monthly_fee || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <form action={toggleClassStatus}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="status" value={item.status} />
                          <button
                            type="submit"
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                          >
                            {item.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </form>

                        <form action={deleteClass}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}