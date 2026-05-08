import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
export function Button({className,type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button type={type} className={cn('rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60',className)} {...props}/>}
