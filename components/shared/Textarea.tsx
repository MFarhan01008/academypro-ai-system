import { TextareaHTMLAttributes } from 'react';
export function Textarea({label,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{label?:string}){return <label className="block space-y-1"><span className="text-sm font-medium text-slate-700">{label}</span><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" {...props}/></label>}
