import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { LiveChatWidget } from './LiveChatWidget';
export function PublicLayout({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-slate-50 text-slate-950"><Navbar />{children}<Footer /><LiveChatWidget /></div>; }
