import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatPKR(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMonth(date?: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
  });
}

export default async function FeeSlipPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: fee, error } = await supabase
    .from("fees")
    .select(
      `
      *,
      students (
        full_name,
        father_name,
        guardian_phone,
        class_id,
        subject_id,
        classes (
          class_name
        ),
        subjects (
          subject_name
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !fee) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-950">Fee Slip Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Fee record nahi mila ya access allowed nahi hai.
        </p>

        <Link
          href="/admin/fees"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Fees
        </Link>
      </div>
    );
  }

  const { data: academy } = await supabase
    .from("academy_settings")
    .select("*")
    .eq("id", fee.academy_id)
    .single();

  const student: any = fee.students;
  const className = student?.classes?.class_name || "-";
  const subjectName = student?.subjects?.subject_name || "-";

  const amountDue = Number(fee.amount_due || 0);
  const paidAmount = Number(fee.paid_amount || 0);
  const balance = amountDue - paidAmount;

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/admin/fees"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Fees
          </Link>

          <PrintButton />
        </div>

        <section className="rounded-2xl border bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b pb-5 text-center">
            <h1 className="text-3xl font-bold text-slate-950">
              {academy?.academy_name || "AcademyPro AI"}
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {academy?.address || "Academy Address"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Phone: {academy?.phone || "-"} | WhatsApp:{" "}
              {academy?.whatsapp_number || "-"}
            </p>

            <h2 className="mt-5 text-xl font-bold uppercase tracking-wide text-slate-900">
              Fee Slip
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Student Name
              </p>
              <p className="mt-1 font-medium text-slate-950">
                {student?.full_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Father Name
              </p>
              <p className="mt-1 font-medium text-slate-950">
                {student?.father_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Class
              </p>
              <p className="mt-1 font-medium text-slate-950">{className}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Subject
              </p>
              <p className="mt-1 font-medium text-slate-950">{subjectName}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Fee Month
              </p>
              <p className="mt-1 font-medium text-slate-950">
                {formatMonth(fee.fee_month)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Due Date
              </p>
              <p className="mt-1 font-medium text-slate-950">
                {formatDate(fee.due_date)}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y">
                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Fee Amount
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {formatPKR(amountDue)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Paid Amount
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {formatPKR(paidAmount)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Balance
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {formatPKR(balance)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Status
                  </td>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-950">
                    {fee.status}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Payment Method
                  </td>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-950">
                    {fee.payment_method || "-"}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">
                    Payment Date
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {formatDate(fee.paid_date)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {fee.notes ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Notes
              </p>
              <p className="mt-1 text-sm text-slate-700">{fee.notes}</p>
            </div>
          ) : null}

          <div className="mt-14 grid grid-cols-2 gap-8">
            <div className="border-t pt-2 text-center text-sm text-slate-600">
              Parent Signature
            </div>

            <div className="border-t pt-2 text-center text-sm text-slate-600">
              Admin Signature
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}