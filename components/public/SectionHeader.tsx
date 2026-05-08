type Props = { eyebrow?: string; title: string; description?: string; center?: boolean };
export function SectionHeader({ eyebrow, title, description, center = false }: Props) {
  return <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>{eyebrow ? <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p> : null}<h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">{title}</h2>{description ? <p className="mt-4 text-base leading-8 text-slate-600">{description}</p> : null}</div>;
}
