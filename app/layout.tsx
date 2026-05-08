import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AcademyPro AI System', description: 'Management system for local academies in Pakistan.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
