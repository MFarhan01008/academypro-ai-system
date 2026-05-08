import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { makeStudentCode, currentMonthStart } from '@/lib/utils';

async function addFee(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: academy } = await supabase.from('academy_settings').select('id, default_monthly_fee').single();
  if (!academy) throw new Error('Create academy settings first');
  const mode = String(formData.get('student_mode') || 'existing');
  let studentId = String(formData.get('student_id') || '');
  const teacherId = String(formData.get('teacher_id') || '') || null;
  const scheduleId = String(formData.get('schedule_id') || '') || null;
  if (mode === 'new') {
    const fullName = String(formData.get('new_full_name') || '').trim();
    if (!fullName) throw new Error('New student name is required.');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({ academy_id: academy.id, full_name: fullName, father_name: String(formData.get('new_father_name') || '').trim(), phone: String(formData.get('new_phone') || '').trim(), guardian_phone: String(formData.get('new_guardian_phone') || '').trim(), class_id: String(formData.get('class_id') || '') || null, subject_id: String(formData.get('subject_id') || '') || null, teacher_id: teacherId, schedule_id: scheduleId, monthly_fee: Number(formData.get('amount_due') || academy.default_monthly_fee || 0), admission_date: new Date().toISOString().slice(0, 10), status: 'active' })
      .select('id')
      .single();
    if (studentError) throw new Error(studentError.message);
    studentId = student.id;
  }
  if (!studentId) throw new Error('Please select or create a student.');
  const { error } = await supabase.from('fees').insert({ academy_id: academy.id, student_id: studentId, teacher_id: teacherId, schedule_id: scheduleId, fee_month: String(formData.get('fee_month')), amount_due: Number(formData.get('amount_due') || 0), discount_amount: Number(formData.get('discount_amount') || 0), paid_amount: Number(formData.get('paid_amount') || 0), status: String(formData.get('status') || 'pending'), payment_method: String(formData.get('payment_method') || 'cash'), due_date: String(formData.get('due_date') || '') || null, paid_date: String(formData.get('paid_date') || '') || null, notes: String(formData.get('notes') || '') });
  if (error) throw new Error(error.message);
  redirect('/admin/fees');
}

export default async function NewFeePage() {
  const supabase = await createClient();
  const { data: academy } = await supabase.from('academy_settings').select('id, default_monthly_fee').single();
  const [studentsRes, classesRes, subjectsRes, teachersRes, schedulesRes] = academy ? await Promise.all([
    supabase.from('students').select('id, full_name, father_name, monthly_fee, student_code').eq('academy_id', academy.id).order('created_at', { ascending: false }),
    supabase.from('classes').select('*').eq('academy_id', academy.id),
    supabase.from('subjects').select('*').eq('academy_id', academy.id),
    supabase.from('teachers').select('*').eq('academy_id', academy.id).eq('status', 'active'),
    supabase.from('class_schedules').select('*, classes(class_name), teachers(full_name)').eq('academy_id', academy.id).eq('status', 'active'),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }] as any;
  const students = studentsRes.data || [];
  return <div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-3xl font-black">Collect Fee</h1><p className="mt-1 text-sm text-slate-500">Select existing student or add a new student while collecting fee. Teacher and timing can also be attached.</p></div><form action={addFee} className="grid gap-6 lg:grid-cols-[1fr_1fr]"><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Student</h2><div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">Use Student ID for tracking. New students automatically get IDs like STU-A1B2C3.</div><div className="mt-5 space-y-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="radio" name="student_mode" value="existing" defaultChecked /> Existing Student</label><select name="student_id" className="w-full rounded-2xl border px-4 py-3 text-sm"><option value="">Select student</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.student_code || makeStudentCode(s.id)} — {s.full_name} {s.father_name ? `(${s.father_name})` : ''} — Rs {s.monthly_fee}</option>)}</select><label className="flex items-center gap-2 pt-4 text-sm font-semibold"><input type="radio" name="student_mode" value="new" /> Add New Student</label><div className="grid gap-3 rounded-2xl border bg-slate-50 p-4"><input name="new_full_name" placeholder="Student name" className="rounded-2xl border px-4 py-3 text-sm" /><input name="new_father_name" placeholder="Father name" className="rounded-2xl border px-4 py-3 text-sm" /><input name="new_phone" placeholder="Student phone" className="rounded-2xl border px-4 py-3 text-sm" /><input name="new_guardian_phone" placeholder="Parent phone" className="rounded-2xl border px-4 py-3 text-sm" /></div></div></section><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Class, Teacher, Timing & Payment</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Select n="class_id" l="Class" items={classesRes.data||[]} k="class_name"/><Select n="subject_id" l="Subject" items={subjectsRes.data||[]} k="subject_name"/><Select n="teacher_id" l="Teacher" items={teachersRes.data||[]} k="full_name"/><label className="text-sm font-semibold">Schedule<select name="schedule_id" className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm"><option value="">Select schedule</option>{(schedulesRes.data||[]).map((s:any)=><option key={s.id} value={s.id}>{s.classes?.class_name} • {s.teachers?.full_name} • {s.start_time}-{s.end_time}</option>)}</select></label><input name="fee_month" type="date" defaultValue={currentMonthStart()} className="rounded-2xl border px-4 py-3 text-sm" /><input name="amount_due" type="number" defaultValue={academy?.default_monthly_fee || 0} placeholder="Amount" className="rounded-2xl border px-4 py-3 text-sm" /><input name="discount_amount" type="number" defaultValue="0" placeholder="Discount" className="rounded-2xl border px-4 py-3 text-sm" /><input name="paid_amount" type="number" defaultValue="0" placeholder="Paid amount" className="rounded-2xl border px-4 py-3 text-sm" /><select name="status" className="rounded-2xl border px-4 py-3 text-sm"><option value="pending">Pending</option><option value="due">Due</option><option value="partial">Partial</option><option value="paid">Paid</option></select><select name="payment_method" className="rounded-2xl border px-4 py-3 text-sm"><option value="cash">Cash</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="other">Other</option></select><input name="due_date" type="date" className="rounded-2xl border px-4 py-3 text-sm" /><input name="paid_date" type="date" className="rounded-2xl border px-4 py-3 text-sm" /></div><textarea name="notes" placeholder="Notes" className="mt-4 w-full rounded-2xl border px-4 py-3 text-sm" /><button className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Save Fee</button></section></form></div>;
}
function Select({n,l,items,k}:any){return <label className="text-sm font-semibold">{l}<select name={n} className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm"><option value="">Select {l}</option>{items.map((i:any)=><option key={i.id} value={i.id}>{i[k]}</option>)}</select></label>}
