const STYLES = {
  pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  failed: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  dead: 'bg-red-500/15 text-red-300 ring-red-500/30',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? 'bg-slate-500/15 text-slate-300 ring-slate-500/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}
