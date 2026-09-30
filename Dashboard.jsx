import { useEffect, useState } from 'react';
import { api } from './api.js';
import { StackBar, deadlineLabel, fmt, pct } from './util.jsx';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', description: '', deadline: '' });
  const [mname, setMname] = useState('');

  const run = async (fn) => { try { setErr(''); await fn(); } catch (e) { setErr(e.message); } };
  const load = () => run(async () => { setProjects(await api.projects()); setMembers(await api.members()); });
  useEffect(() => { load(); }, []);

  const create = (e) => { e.preventDefault(); run(async () => {
    await api.addProject(form); setForm({ name: '', description: '', deadline: '' }); await load();
  }); };
  const addMember = (e) => { e.preventDefault(); run(async () => { await api.addMember(mname); setMname(''); await load(); }); };
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const all = projects.reduce((a, p) => ({ t: a.t + p.total, d: a.d + p.done, o: a.o + p.overdue }), { t: 0, d: 0, o: 0 });

  return (
    <div className="dash">
      <section>
        <div className="kpis">
          <div className="card kpi"><b>{projects.length}</b><span className="mut">Projects</span></div>
          <div className="card kpi"><b>{pct(all.d, all.t)}%</b><span className="mut">Overall progress</span></div>
          <div className="card kpi"><b className={all.o ? 'late' : ''}>{all.o}</b><span className="mut">Overdue tasks</span></div>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="grid">
          {projects.map((p) => {
            const prog = pct(p.done, p.total), dl = deadlineLabel(p.deadline, prog);
            return (
              <a key={p.id} href={'#' + p.id} className="card pcard">
                <div className="between"><h3>{p.name}</h3><span className={'pill ' + dl.cls}>{dl.text}</span></div>
                <div className="mut">{p.description || 'No description'}</div>
                <div className="between big"><b>{prog}%</b><span className="mut">{p.done}/{p.total} tasks</span></div>
                <StackBar {...p} />
                <div className="mut small">Deadline {fmt(p.deadline)}{p.overdue ? <span className="late"> · {p.overdue} overdue</span> : ''}</div>
              </a>
            );
          })}
          {!projects.length && <div className="empty">No projects yet. Create one to begin.</div>}
        </div>
      </section>

      <aside>
        <form className="card" onSubmit={create}>
          <h3>New project</h3>
          <label>Name<input {...f('name')} required /></label>
          <label>Description<input {...f('description')} /></label>
          <label>Deadline<input type="date" {...f('deadline')} /></label>
          <button className="p">Create project</button>
        </form>
        <div className="card">
          <h3>Team members</h3>
          <form className="row" onSubmit={addMember}>
            <input placeholder="Add a member" value={mname} onChange={(e) => setMname(e.target.value)} aria-label="Member name" />
            <button>Add</button>
          </form>
          <ul className="members">
            {members.map((m) => (
              <li key={m.id}>{m.name}<button className="g" onClick={() => run(async () => { await api.delMember(m.id); await load(); })}>Remove</button></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
