'use client';
import { createClient } from '@/lib/supabase/client';
export function LogoutButton(){async function logout(){const supabase=createClient();await supabase.auth.signOut();window.location.href='/login'}return <button onClick={logout} className="text-sm font-semibold text-red-600">Logout</button>}
