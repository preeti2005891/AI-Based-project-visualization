import { useEffect, useState } from 'react';
import { api } from './api.js';
import { StackBar, deadlineLabel, fmt, pct, today } from './util.jsx';

const COLS = [['todo', 'To Do'], ['in_progress', 'In Progress'], ['review', 'Review'], ['done', 'Done']];

export default function Project({ id }) {
  const [p, setP] = useState(null);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [ins, setIns] = useState(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState('');
  const [nt, setNt] = useState({ title: '', assignee_id: '', due_date: '', priority: 'medium' });

  const run = async (fn) => { try { setErr(''); await fn(); } catch (e) { setErr(e.message); } };
  const load = () => run(async () => setP(await api.project(id)));
  useEffect(() => { setIns(null); load(); api.members().then(setMembers).catch(() => {}); }, [id]);

  if (!p) return <div className="empty">{err || 'Loading...'}</div>;

  const patch = (t, b) => run(async () => { await api.patchTask(t.id, b); await load(); });
  const add = (e) => { e.preventDefault(); run(async () => {
    await api.addTask(id, { ...nt, assignee_id: nt.assignee_id || null, due_date: nt.due_date || null });
    setNt({ ...nt, title: '' }); await load();
  }); };
  const analyze = () => { setBusy(true); run(async () => setIns(await api.insights(id))).finally(() => setBusy(false)); };
  const delProject = () => confirm(`Delete "${p.name}"?`) && run(async () => { await api.delProject(id); location.hash = ''; });

  const count = (s) => p.tasks.filter((t) => t.status === s).length;
  const c = { todo: count('todo'), in_progress: count('in_progress'), review: count('review'), done: count('done'), total: p.tasks.length };
  const prog = pct(c.done, c.total), dl = deadlineLabel(p.deadline, prog);
  const overdue = p.tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today()).length;
  const load_ = {};
  p.tasks.filter((t) => t.status !== 'done').forEach((t) => { const n = t.assignee_name || 'Unassigned'; load_[n] = (load_[n] || 0) + 1; });
  const maxLoad = Math.max(1, ...Object.values(load_));

  return (
    <div>
      <a href="#" className="back">← All projects</a>
      <div className="between top">
        <div><h2>{p.name}</h2><div className="mut">{p.description}</div></div>
        <button className="g" onClick={delProject}>Delete project</button>
      </div>
      {err && <div className="err" role="alert">{err}</div>}

      <div className="kpis">
        <div className="card kpi"><b>{prog}%</b><span className="mut">Progress ({c.done}/{c.total})</span></div>
        <div className="card kpi"><b><span className={'pill ' + dl.cls}>{dl.text}</span></b><span className="mut">Deadline {fmt(p.deadline)}</span></div>
        <div className="card kpi"><b className={overdue ? 'late' : ''}>{overdue}</b><span className="mut">Overdue tasks</span></div>
      </div>
      <StackBar {...c} />
      <div className="legend mut small">
        {COLS.map(([k, l]) => <span key={k}><i className={'dot s-' + k} />{l} {c[k]}</span>)}
      </div>

      <div className="board">
        {COLS.map(([k, label]) => (
          <div key={k} className={'col' + (over === k ? ' over' : '')}
            onDragOver={(e) => { e.preventDefault(); setOver(k); }}
            onDragLeave={() => setOver('')}
            onDrop={(e) => { e.preventDefault(); setOver('');
              const t = p.tasks.find((x) => x.id === Number(e.dataTransfer.getData('text/plain')));
              if (t && t.status !== k) patch(t, { status: k }); }}>
            <div className="colhead"><i className={'dot s-' + k} />{label}<span className="mut">{c[k]}</span></div>
            {p.tasks.filter((t) => t.status === k).map((t) => (
              <div key={t.id} className="task" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))}>
                <div className="between"><b>{t.title}</b><span className={'prio ' + t.priority}>{t.priority}</span></div>
                <div className={'mut small' + (t.status !== 'done' && t.due_date && t.due_date < today() ? ' late' : '')}>
                  {t.status === 'done' ? `Completed ${fmt(t.completed_at)}` : `Due ${fmt(t.due_date)}`}
                </div>
                <div className="row">
                  <select value={t.assignee_id || ''} onChange={(e) => patch(t, { assignee_id: e.target.value ? Number(e.target.value) : null })} aria-label="Assignee">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select value={t.status} onChange={(e) => patch(t, { status: e.target.value })} aria-label="Status">
                    {COLS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
                  </select>
                  <button className="g" aria-label="Delete task" onClick={() => run(async () => { await api.delTask(t.id); await load(); })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="two">
        <form className="card" onSubmit={add}>
          <h3>Add a task</h3>
          <input placeholder="Task title" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} required aria-label="Task title" />
          <div className="row wrap">
            <select value={nt.assignee_id} onChange={(e) => setNt({ ...nt, assignee_id: e.target.value })} aria-label="Assignee">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={nt.priority} onChange={(e) => setNt({ ...nt, priority: e.target.value })} aria-label="Priority">
              <option>low</option><option>medium</option><option>high</option>
            </select>
            <input type="date" value={nt.due_date} onChange={(e) => setNt({ ...nt, due_date: e.target.value })} aria-label="Due date" />
          </div>
          <button className="p">Add task</button>
        </form>

        <div className="card">
          <h3>Workload (open tasks)</h3>
          {Object.entries(load_).map(([n, v]) => (
            <div key={n} className="wl"><span>{n}</span><div className="bar"><i style={{ width: (v / maxLoad) * 100 + '%' }} /></div><b>{v}</b></div>
          ))}
          {!Object.keys(load_).length && <div className="mut">No open tasks.</div>}
        </div>
      </div>

      <div className="card ai">
        <div className="between">
          <h3>AI insights</h3>
          <button onClick={analyze} disabled={busy}>{busy ? 'Analyzing...' : ins ? 'Re-analyze' : 'Analyze project'}</button>
        </div>
        {!ins && <div className="mut">Get a risk assessment, projected finish date and recommendations.</div>}
        {ins && (<>
          <div className="row wrap">
            <span className={'pill risk-' + ins.metrics.risk}>Risk: {ins.metrics.risk}</span>
            <span className="pill">Velocity {ins.metrics.velocity}/day</span>
            <span className="pill">Projected finish {ins.metrics.projectedFinish ? fmt(ins.metrics.projectedFinish) : 'n/a'}</span>
            {ins.metrics.expected != null && <span className="pill">Planned {ins.metrics.expected}% vs actual {ins.metrics.progress}%</span>}
          </div>
          <p>{ins.summary}</p>
          <ul>{ins.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <div className="mut small">{ins.source === 'ai' ? 'Written by Claude from live project metrics' : 'Generated by the built-in rule engine (set ANTHROPIC_API_KEY for AI summaries)'}</div>
        </>)}
      </div>
    </div>
  );
}
