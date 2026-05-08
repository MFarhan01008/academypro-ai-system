import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    month?: string;
    class_id?: string;
    status?: string;
  }>;
};

function formatPKR(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  const startDate = new Date(year, monthNumber - 1, 1);
  const endDate = new Date(year, monthNumber, 1);

  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};

  const selectedMonth = params.month || getCurrentMonth();
  const selectedClassId = params.class_id || "all";
  const selectedStatus = params.status || "all";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
        <p className="mt-2 text-sm text-red-600">Please login first.</p>
      </div>
    );
  }

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!academy) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>

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
      </div>
    );
  }

  const { start, end } = getMonthRange(selectedMonth);

  const { data: classes = [] } = await supabase
    .from("classes")
    .select("*")
    .eq("academy_id", academy.id)
    .order("class_name", { ascending: true });

  const { data: feesData = [], error: feesError } = await supabase
    .from("fees")
    .select(
      `
      *,
      students (
        id,
        full_name,
        class_id
      )
    `
    )
    .eq("academy_id", academy.id)
    .gte("fee_month", start)
    .lt("fee_month", end)
    .order("fee_month", { ascending: false });

  const { data: leadsData = [], error: leadsError } = await supabase
    .from("admission_leads")
    .select("*")
    .eq("academy_id", academy.id)
    .gte("created_at", `${start}T00:00:00`)
    .lt("created_at", `${end}T00:00:00`)
    .order("created_at", { ascending: false });

  if (feesError || leadsError) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
        <p className="mt-4 text-sm text-red-600">
          {feesError?.message || leadsError?.message}
        </p>
      </div>
    );
  }

  let filteredFees = feesData || [];

  if (selectedClassId !== "all") {
    filteredFees = filteredFees.filter((fee: any) => {
      return fee.students?.class_id === selectedClassId;
    });
  }

  if (selectedStatus !== "all") {
    filteredFees = filteredFees.filter((fee: any) => {
      return fee.status === selectedStatus;
    });
  }

  const totalCollected = filteredFees.reduce((total: number, fee: any) => {
    return total + Number(fee.paid_amount || 0);
  }, 0);

  const totalUnpaidAmount = filteredFees.reduce((total: number, fee: any) => {
    if (fee.status === "paid" || fee.status === "cancelled") {
      return total;
    }

    const amountDue = Number(fee.amount_due || 0);
    const paidAmount = Number(fee.paid_amount || 0);

    return total + Math.max(amountDue - paidAmount, 0);
  }, 0);

  const paidStudents = filteredFees.filter((fee: any) => {
    return fee.status === "paid";
  }).length;

  const unpaidStudents = filteredFees.filter((fee: any) => {
    return fee.status !== "paid" && fee.status !== "cancelled";
  }).length;

  const newAdmissionLeads = (leadsData || []).filter((lead: any) => {
    return lead.status === "new";
  }).length;

  const trialClassRequests = (leadsData || []).filter((lead: any) => {
    return (
      lead.status === "trial booked" ||
      lead.status === "trial_booked" ||
      String(lead.message || "").toLowerCase().includes("trial")
    );
  }).length;

  const admittedStudents = (leadsData || []).filter((lead: any) => {
    return lead.status === "admitted";
  }).length;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monthly fee collection, pending amount, and admission leads report.
        </p>
      </div>

      <form
        method="GET"
        className="mt-6 grid gap-4 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Month
          </label>
          <input
            type="month"
            name="month"
            defaultValue={selectedMonth}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Class
          </label>
          <select
            name="class_id"
            defaultValue={selectedClassId}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Classes</option>

            {(classes || []).map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.class_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Fee Status
          </label>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="due">Due</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard
          title="Total Fee Collected"
          value={formatPKR(totalCollected)}
        />

        <ReportCard
          title="Total Unpaid Amount"
          value={formatPKR(totalUnpaidAmount)}
        />

        <ReportCard title="Paid Students" value={String(paidStudents)} />

        <ReportCard title="Unpaid Students" value={String(unpaidStudents)} />

        <ReportCard title="New Admission Leads" value={String(newAdmissionLeads)} />

        <ReportCard title="Trial Class Requests" value={String(trialClassRequests)} />

        <ReportCard title="Admitted Students" value={String(admittedStudents)} />

        <ReportCard title="Total Fee Records" value={String(filteredFees.length)} />
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Fee Records This Month
          </h2>
        </div>

        {filteredFees.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">
            Is month ke liye koi fee record nahi mila.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Month</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredFees.map((fee: any) => {
                  const amountDue = Number(fee.amount_due || 0);
                  const paidAmount = Number(fee.paid_amount || 0);
                  const balance = Math.max(amountDue - paidAmount, 0);

                  return (
                    <tr key={fee.id}>
                      <td className="px-5 py-3 font-medium text-slate-950">
                        {fee.students?.full_name || "-"}
                      </td>

                      <td className="px-5 py-3 text-slate-600">
                        {fee.fee_month}
                      </td>

                      <td className="px-5 py-3 text-slate-600">
                        {formatPKR(amountDue)}
                      </td>

                      <td className="px-5 py-3 text-slate-600">
                        {formatPKR(paidAmount)}
                      </td>

                      <td className="px-5 py-3 text-slate-600">
                        {formatPKR(balance)}
                      </td>

                      <td className="px-5 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                          {fee.status}
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

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Admission Leads This Month
          </h2>
        </div>

        {!leadsData || leadsData.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">
            Is month ke liye koi admission lead nahi mili.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Message</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {(leadsData || []).map((lead: any) => (
                  <tr key={lead.id}>
                    <td className="px-5 py-3 font-medium text-slate-950">
                      {lead.student_name || "-"}
                    </td>

                    <td className="px-5 py-3 text-slate-600">
                      {lead.phone || "-"}
                    </td>

                    <td className="px-5 py-3 text-slate-600">
                      {lead.interested_class || "-"}
                    </td>

                    <td className="px-5 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                        {lead.status}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-600">
                      {lead.message || "-"}
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

function ReportCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}