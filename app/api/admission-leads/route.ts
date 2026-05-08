import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};
    if (contentType.includes('application/json')) body = await req.json();
    else body = Object.fromEntries((await req.formData()).entries());
    const supabase = await createClient();
    const { data: academy } = await supabase.from('academy_settings').select('id').eq('status', 'active').limit(1).single();
    if (!academy) return NextResponse.json({ error: 'Academy not configured' }, { status: 400 });
    const { error } = await supabase.from('admission_leads').insert({ academy_id: academy.id, student_name: body.student_name, phone: body.phone, interested_class: body.interested_class, subject_interest: body.subject_interest, message: body.message || '', status: 'new' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!contentType.includes('application/json')) return NextResponse.redirect(new URL('/admission?success=1', req.url));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not submit lead.' }, { status: 500 });
  }
}
