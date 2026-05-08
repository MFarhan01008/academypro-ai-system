import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

async function generateReply(ai: GoogleGenAI, systemPrompt: string, finalPrompt: string) {
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];
  let lastError: any;
  for (const model of models) {
    try {
      const result = await ai.models.generateContent({ model, contents: finalPrompt, config: { systemInstruction: systemPrompt } });
      return { text: result.text || '', model };
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || '').toLowerCase();
      if (!message.includes('503') && !message.includes('unavailable') && !message.includes('high demand')) throw error;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];
    if (!message || typeof message !== 'string') return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key missing.' }, { status: 500 });
    const supabase = await createClient();
    const { data: academy } = await supabase.from('academy_settings').select('*').eq('status', 'active').limit(1).single();
    if (!academy) return NextResponse.json({ error: 'Academy settings not configured.' }, { status: 404 });
    const [classesRes, subjectsRes, teachersRes, schedulesRes] = await Promise.all([
      supabase.from('classes').select('class_name, description, default_monthly_fee, status').eq('academy_id', academy.id).eq('status', 'active'),
      supabase.from('subjects').select('subject_name, teacher_name, status').eq('academy_id', academy.id).eq('status', 'active'),
      supabase.from('teachers').select('full_name, qualification, experience_years, subject_specialty, bio, public_visible, featured, status').eq('academy_id', academy.id).eq('status', 'active').eq('public_visible', true),
      supabase.from('class_schedules').select('batch_name, days, start_time, end_time, monthly_fee, room, classes(class_name), subjects(subject_name), teachers(full_name)').eq('academy_id', academy.id).eq('status', 'active'),
    ]);
    const classes = classesRes.data || [];
    const subjects = subjectsRes.data || [];
    const teachers = teachersRes.data || [];
    const schedules = schedulesRes.data || [];
    const academyContext = `
Academy: ${academy.academy_name || 'Academy'}
Phone: ${academy.phone || 'Not provided'}
WhatsApp: ${academy.whatsapp_number || 'Not provided'}
Address: ${academy.address || 'Not provided'}
Default Monthly Fee: Rs. ${academy.default_monthly_fee || 0}

Classes:
${classes.length ? classes.map((c: any) => `- ${c.class_name}, Fee: Rs. ${Number(c.default_monthly_fee || 0) || academy.default_monthly_fee || 0}, Details: ${c.description || 'No details'}`).join('\n') : 'No classes added.'}

Schedules:
${schedules.length ? schedules.map((s: any) => `- ${s.classes?.class_name || 'Class'} / ${s.subjects?.subject_name || 'Subject'} with ${s.teachers?.full_name || 'teacher'}: ${s.days || ''} ${s.start_time || ''}-${s.end_time || ''}, Fee Rs. ${s.monthly_fee || academy.default_monthly_fee || 0}`).join('\n') : 'Timing details may be available in instructions.'}

Teachers public info:
${teachers.length ? teachers.map((t: any) => `- ${t.full_name}, ${t.subject_specialty || 'Teacher'}, ${t.qualification || ''}, ${t.experience_years || 0} years experience. ${t.bio || ''}`).join('\n') : 'No public teachers added.'}

Subjects:
${subjects.length ? subjects.map((s: any) => `- ${s.subject_name}`).join('\n') : 'No subjects added.'}

Instructions:
${academy.admission_instructions || ''}
`;
    const systemPrompt = `You are a friendly public website information assistant for a Pakistani academy.
Only answer academy information: classes, fees, timings, public teacher info, admission process, trial class, location, contact, WhatsApp, discount policy.
Do not collect name or phone number. Do not act like a registration form.
Never reveal teacher private info like phone, CNIC, address, salary.
Use simple Roman Urdu and English mix. Keep replies short but useful.
If user asks admission, include timing, fee, process, address and contact when available.
Do not invent details. If unknown say: "Ye detail abhi available nahi hai, academy se confirm karna hoga."

${academyContext}`;
    const conversationText = history.slice(-8).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const finalPrompt = `Previous conversation:\n${conversationText || 'No previous conversation.'}\n\nUser: ${message}\n\nReply naturally. Only provide information. Do not ask for personal details.`;
    const ai = new GoogleGenAI({ apiKey });
    const result = await generateReply(ai, systemPrompt, finalPrompt);
    const reply = result.text || 'Ye detail abhi available nahi hai, academy se confirm karna hoga.';
    return NextResponse.json({ reply, model: result.model });
  } catch (error: any) {
    const raw = String(error?.message || '');
    const message = raw.includes('503') || raw.toLowerCase().includes('unavailable') ? 'AI service abhi busy hai. Please thori der baad try karein.' : 'AI reply generate nahi ho saka. Please dobara try karein.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
