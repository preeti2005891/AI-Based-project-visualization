export const today = () => new Date().toISOString().slice(0, 10);
export const fmt = (iso) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'No date');
export const daysLeft = (iso) => (iso ? Math.round((new Date(iso + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5) : null);
export const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);

export function deadlineLabel(deadline, progress) {
  if (progress === 100) return { text: 'Completed', cls: 'ok' };
  const d = daysLeft(deadline);
  if (d == null) return { text: 'No deadline', cls: '' };
  if (d < 0) return { text: `${-d}d overdue`, cls: 'bad' };
  return { text: d === 0 ? 'Due today' : `${d}d left`, cls: d <= 3 ? 'warn' : '' };
}

export function StackBar({ todo, in_progress, review, done, total }) {
  if (!total) return <div className="stack" />;
  return (
    <div className="stack" title={`${done} done · ${review} review · ${in_progress} in progress · ${todo} to do`}>
      {[['done', done], ['review', review], ['in_progress', in_progress], ['todo', todo]].map(([k, v]) =>
        v ? <i key={k} className={'s-' + k} style={{ width: (v / total) * 100 + '%' }} /> : null)}
    </div>
  );
}
