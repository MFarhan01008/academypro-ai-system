import { createClient } from '@/lib/supabase/server';
export async function getCurrentUserAndAcademy(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return{supabase,user:null,academy:null};const {data:academy}=await supabase.from('academy_settings').select('*').eq('owner_id',user.id).maybeSingle();return{supabase,user,academy};}
