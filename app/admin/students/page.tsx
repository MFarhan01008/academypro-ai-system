import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPKR, makeStudentCode } from '@/lib/utils';

export default async function StudentsPage({ searchParams }: { searchParams?: Promise<{ q?: string; status?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const query = params.q || '';
  const status = params.status || 'all';
  const supabase = await createClient();
  const { data: academy } = await supabase.from('academy_settings').select('id').single();

  let students: any[] = [];
  if (academy) {
    let request = supabase.from('students').select('*, classes(class_name), subjects(subject_name), teachers(full_name, teacher_code), class_schedules(batch_name,start_time,end_time)').eq('academy_id', academy.id).order('created_at', { ascending: false });
    if (status !== 'all') request = request.eq('status', status);
    const { data } = await request;
    students = data || [];
  }

  const filtered = query
    ? students.filter((s) => `${s.full_name} ${s.father_name || ''} ${makeStudentCode(s.id)}`.toLowerCase().includes(query.toLowerCase()))
    : students;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-3xl font-black">Students</h1><p className="mt-1 text-sm text-slate-500">Manage student records with unique IDs.</p></div>
        <Link href="/admin/students/new" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Add Student</Link>
      </div>

      <form className="grid gap-3 rounded-3xl border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_140px]">
        <input name="q" defaultValue={query} placeholder="Search by name or Student ID..." className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-blue-500" />
        <select name="status" defaultValue={status} className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-blue-500">
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="left">Left</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Filter</button>
      </form>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Student ID</th><th className="p-4">Name</th><th className="p-4">Class</th><th className="p-4">Subject</th><th className="p-4">Teacher / Timing</th><th className="p-4">Parent Phone</th><th className="p-4">Fee</th><th className="p-4">Status</th></tr></thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? <tr><td className="p-5 text-slate-500" colSpan={8}>No students found.</td></tr> : filtered.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50"><td className="p-4 font-mono text-xs font-bold text-blue-700">{makeStudentCode(student.id)}</td><td className="p-4"><Link href={`/admin/students/${student.id}`} className="font-semibold hover:text-blue-600">{student.full_name}</Link><p className="text-xs text-slate-500">Father: {student.father_name || '-'}</p></td><td className="p-4">{student.classes?.class_name || '-'}</td><td className="p-4">{student.subjects?.subject_name || '-'}</td><td className="p-4">{student.teachers?.full_name || '-'}<p className="text-xs text-slate-500">{student.class_schedules?.start_time ? `${student.class_schedules.start_time} - ${student.class_schedules.end_time}` : '-'}</p></td><td className="p-4">{student.guardian_phone || '-'}</td><td className="p-4">{formatPKR(Number(student.monthly_fee || 0))}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">{student.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
