import { createClient } from "@/lib/supabase/server";
import { PrintReportButton } from "./PrintReportButton";

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

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
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

  const { data: classesData } = await supabase
    .from("classes")
    .select("*")
    .eq("academy_id", academy.id)
    .order("class_name", { ascending: true });

  const { data: feesData, error: feesError } = await supabase
    .from("fees")
    .select(
      `
      *,
      students (
        id,
        full_name,
        father_name,
        class_id
      )
    `
    )
    .eq("academy_id", academy.id)
    .gte("fee_month", start)
    .lt("fee_month", end)
    .order("fee_month", { ascending: false });

  const { data: leadsData, error: leadsError } = await supabase
    .from("admission_leads")
    .select("*")
    .eq("academy_id", academy.id)
    .gte("created_at", `${start}T00:00:00`)
    .lt("created_at", `${end}T00:00:00`)
    .order("created_at", { ascending: false });

  const { data: teachersData } = await supabase
    .from("teachers")
    .select("id, teacher_code, full_name, subject_specialty, monthly_salary")
    .eq("academy_id", academy.id);

  const { data: salariesData } = await supabase
    .from("teacher_salaries")
    .select("*")
    .eq("academy_id", academy.id)
    .gte("salary_month", start)
    .lt("salary_month", end);

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

  const classes = Array.isArray(classesData) ? classesData : [];
  const fees = Array.isArray(feesData) ? feesData : [];
  const leads = Array.isArray(leadsData) ? leadsData : [];
  const teachers = Array.isArray(teachersData) ? teachersData : [];
  const salaries = Array.isArray(salariesData) ? salariesData : [];

  let filteredFees = fees;

  if (selectedClassId !== "all") {
    filteredFees = filteredFees.filter((fee: any) => fee.students?.class_id === selectedClassId);
  }

  if (selectedStatus !== "all") {
    filteredFees = filteredFees.filter((fee: any) => fee.status === selectedStatus);
  }

  const totalCollected = filteredFees.reduce((total: number, fee: any) => {
    return total + Number(fee.paid_amount || 0);
  }, 0);

  const totalDue = filteredFees.reduce((total: number, fee: any) => total + Number(fee.amount_due || 0), 0);

  const totalDiscount = filteredFees.reduce((total: number, fee: any) => total + Number(fee.discount_amount || 0), 0);

  const totalUnpaidAmount = filteredFees.reduce((total: number, fee: any) => {
    if (fee.status === "paid" || fee.status === "cancelled") return total;
    const amountDue = Number(fee.amount_due || 0);
    const discount = Number(fee.discount_amount || 0);
    const paidAmount = Number(fee.paid_amount || 0);
    return total + Math.max(amountDue - discount - paidAmount, 0);
  }, 0);

  const paidStudents = filteredFees.filter((fee: any) => fee.status === "paid").length;
  const unpaidStudents = filteredFees.filter((fee: any) => fee.status !== "paid" && fee.status !== "cancelled").length;
  const newAdmissionLeads = leads.filter((lead: any) => lead.status === "new").length;
  const trialClassRequests = leads.filter((lead: any) => {
    return lead.status === "trial booked" || lead.status === "trial_booked" || String(lead.message || "").toLowerCase().includes("trial");
  }).length;
  const admittedStudents = leads.filter((lead: any) => lead.status === "admitted").length;

  const salaryPaid = salaries.reduce((sum: number, item: any) => sum + Number(item.paid_amount || 0), 0);
  const salaryBase = salaries.reduce((sum: number, item: any) => sum + Number(item.base_salary || 0), 0);
  const netAfterPaidSalaries = totalCollected - salaryPaid;

  const classMap = new Map(classes.map((item: any) => [item.id, item.class_name]));
  const classRows = classes.map((classItem: any) => {
    const classFees = filteredFees.filter((fee: any) => fee.students?.class_id === classItem.id);
    const collected = classFees.reduce((sum: number, fee: any) => sum + Number(fee.paid_amount || 0), 0);
    const pending = classFees.reduce((sum: number, fee: any) => {
      const due = Number(fee.amount_due || 0) - Number(fee.discount_amount || 0) - Number(fee.paid_amount || 0);
      return sum + Math.max(due, 0);
    }, 0);

    return {
      id: classItem.id,
      name: classItem.class_name,
      records: classFees.length,
      collected,
      pending,
    };
  }).filter((row: any) => row.records > 0);

  const reportTitle = `${academy.academy_name || "Academy"} Monthly Report`;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monthly fee collection, salary, class-wise and admission leads report.
          </p>
        </div>
        <PrintReportButton />
      </div>

      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-black text-slate-950">{reportTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">Month: {formatMonthLabel(selectedMonth)}</p>
        <p className="mt-1 text-sm text-slate-600">Generated: {new Date().toLocaleDateString("en-PK")}</p>
      </div>

      <form
        method="GET"
        className="mt-6 grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4 print:hidden"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Month</label>
          <input
            type="month"
            name="month"
            defaultValue={selectedMonth}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Class</label>
          <select
            name="class_id"
            defaultValue={selectedClassId}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Classes</option>
            {classes.map((item: any) => (
              <option key={item.id} value={item.id}>{item.class_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Fee Status</label>
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
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Apply Filters
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-3">
        <ReportCard title="Total Due" value={formatPKR(totalDue)} />
        <ReportCard title="Total Discount" value={formatPKR(totalDiscount)} />
        <ReportCard title="Fee Collected" value={formatPKR(totalCollected)} />
        <ReportCard title="Pending Amount" value={formatPKR(totalUnpaidAmount)} danger />
        <ReportCard title="Paid Records" value={String(paidStudents)} />
        <ReportCard title="Unpaid Records" value={String(unpaidStudents)} />
        <ReportCard title="New Leads" value={String(newAdmissionLeads)} />
        <ReportCard title="Trial Requests" value={String(trialClassRequests)} />
        <ReportCard title="Admitted Students" value={String(admittedStudents)} />
        <ReportCard title="Salary Base" value={formatPKR(salaryBase)} />
        <ReportCard title="Salary Paid" value={formatPKR(salaryPaid)} />
        <ReportCard title="Net After Salary" value={formatPKR(netAfterPaidSalaries)} />
      </div>

      <ReportSection title="Class-wise Fee Summary">
        {classRows.length === 0 ? (
          <EmptyState text="Class-wise fee data available nahi hai." />
        ) : (
          <Table
            headers={["Class", "Records", "Collected", "Pending"]}
            rows={classRows.map((row: any) => [row.name, row.records, formatPKR(row.collected), formatPKR(row.pending)])}
          />
        )}
      </ReportSection>

      <ReportSection title="Fee Records This Month">
        {filteredFees.length === 0 ? (
          <EmptyState text="Is month ke liye koi fee record nahi mila." />
        ) : (
          <Table
            headers={["Student", "Class", "Month", "Amount", "Paid", "Balance", "Status"]}
            rows={filteredFees.map((fee: any) => {
              const amountDue = Number(fee.amount_due || 0);
              const discount = Number(fee.discount_amount || 0);
              const paidAmount = Number(fee.paid_amount || 0);
              const balance = Math.max(amountDue - discount - paidAmount, 0);
              return [
                fee.students?.full_name || "-",
                classMap.get(fee.students?.class_id) || "-",
                fee.fee_month,
                formatPKR(amountDue),
                formatPKR(paidAmount),
                formatPKR(balance),
                fee.status || "-",
              ];
            })}
          />
        )}
      </ReportSection>

      <ReportSection title="Teacher Salary Summary">
        {teachers.length === 0 ? (
          <EmptyState text="Teachers data available nahi hai." />
        ) : (
          <Table
            headers={["Teacher", "Subject", "Base Salary", "Paid Salary"]}
            rows={teachers.map((teacher: any) => {
              const teacherSalaryPaid = salaries
                .filter((salary: any) => salary.teacher_id === teacher.id)
                .reduce((sum: number, salary: any) => sum + Number(salary.paid_amount || 0), 0);
              return [
                teacher.teacher_code ? `${teacher.full_name} (${teacher.teacher_code})` : teacher.full_name,
                teacher.subject_specialty || "-",
                formatPKR(Number(teacher.monthly_salary || 0)),
                formatPKR(teacherSalaryPaid),
              ];
            })}
          />
        )}
      </ReportSection>

      <ReportSection title="Admission Leads This Month">
        {leads.length === 0 ? (
          <EmptyState text="Is month ke liye koi admission lead nahi mili." />
        ) : (
          <Table
            headers={["Name", "Phone", "Class", "Status", "Message"]}
            rows={leads.map((lead: any) => [
              lead.student_name || "-",
              lead.phone || "-",
              lead.interested_class || "-",
              lead.status || "-",
              lead.message || "-",
            ])}
          />
        )}
      </ReportSection>

      <div className="mt-10 hidden grid-cols-2 gap-10 print:grid">
        <div className="border-t border-slate-400 pt-2 text-center text-sm font-semibold text-slate-600">Prepared By</div>
        <div className="border-t border-slate-400 pt-2 text-center text-sm font-semibold text-slate-600">Director Signature</div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, danger = false }: { title: string; value: string; danger?: boolean }) {
  return (
    <div className={danger ? "rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm print:p-3" : "rounded-xl border bg-white p-5 shadow-sm print:p-3"}>
      <p className={danger ? "text-sm font-semibold text-red-600" : "text-sm text-slate-500"}>{title}</p>
      <p className={danger ? "mt-2 text-2xl font-bold text-red-700 print:text-lg" : "mt-2 text-2xl font-bold text-slate-950 print:text-lg"}>{value}</p>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border bg-white shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="border-b p-5 print:p-3">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-5 text-sm text-slate-600">{text}</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 print:bg-white">
          <tr>{headers.map((header) => <th key={header} className="px-5 py-3 font-semibold print:px-2 print:py-2">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-3 text-slate-700 print:px-2 print:py-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}