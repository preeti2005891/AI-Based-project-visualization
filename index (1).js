import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { analyze } from './insights.js';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s));
const bad = (res, m) => res.status(400).json({ error: m });
const today = () => new Date().toISOString().slice(0, 10);

const app = express();
app.use(cors());
app.use(express.json());

// ----- members -----
app.get('/api/members', (_q, res) => res.json(db.prepare('SELECT * FROM members ORDER BY name').all()));
app.post('/api/members', (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return bad(res, 'Name is required');
  try {
    const { lastInsertRowid: id } = db.prepare('INSERT INTO members (name) VALUES (?)').run(name);
    res.status(201).json({ id, name });
  } catch { bad(res, 'Member already exists'); }
});
app.delete('/api/members/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// ----- projects -----
app.get('/api/projects', (_q, res) => {
  res.json(db.prepare(`
    SELECT p.*, COUNT(t.id) total,
      COALESCE(SUM(t.status='todo'),0) todo,
      COALESCE(SUM(t.status='in_progress'),0) in_progress,
      COALESCE(SUM(t.status='review'),0) review,
      COALESCE(SUM(t.status='done'),0) done,
      COALESCE(SUM(t.status!='done' AND t.due_date IS NOT NULL AND t.due_date < ?),0) overdue
    FROM projects p LEFT JOIN tasks t ON t.project_id=p.id
    GROUP BY p.id ORDER BY p.id DESC`).all(today()));
});

app.post('/api/projects', (req, res) => {
  const { name, description = '', deadline = null } = req.body || {};
  if (!name?.trim()) return bad(res, 'Project name is required');
  if (deadline && !isDate(deadline)) return bad(res, 'Deadline must be YYYY-MM-DD');
  const { lastInsertRowid: id } = db.prepare('INSERT INTO projects (name,description,deadline) VALUES (?,?,?)')
    .run(name.trim(), description.trim(), deadline || null);
  res.status(201).json(getProject(id));
});

function getProject(id) {
  const p = db.prepare('SELECT * FROM projects WHERE id=?').get(id);
  if (!p) return null;
  p.tasks = db.prepare(`SELECT t.*, m.name assignee_name FROM tasks t
    LEFT JOIN members m ON m.id=t.assignee_id WHERE t.project_id=? ORDER BY t.id`).all(id);
  return p;
}

app.get('/api/projects/:id', (req, res) => {
  const p = getProject(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

app.patch('/api/projects/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const { name = p.name, description = p.description, deadline = p.deadline } = req.body || {};
  if (deadline && !isDate(deadline)) return bad(res, 'Deadline must be YYYY-MM-DD');
  db.prepare('UPDATE projects SET name=?, description=?, deadline=? WHERE id=?').run(name, description, deadline || null, p.id);
  res.json(getProject(p.id));
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/projects/:id/insights', async (req, res) => {
  const p = getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(await analyze(p, p.tasks));
});

// ----- tasks -----
app.post('/api/projects/:id/tasks', (req, res) => {
  const { title, status = 'todo', priority = 'medium', assignee_id = null, due_date = null } = req.body || {};
  if (!title?.trim()) return bad(res, 'Task title is required');
  if (!STATUSES.includes(status)) return bad(res, 'Invalid status');
  if (!PRIORITIES.includes(priority)) return bad(res, 'Invalid priority');
  if (due_date && !isDate(due_date)) return bad(res, 'Due date must be YYYY-MM-DD');
  if (!db.prepare('SELECT 1 FROM projects WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('INSERT INTO tasks (project_id,title,status,priority,assignee_id,due_date,completed_at) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.id, title.trim(), status, priority, assignee_id || null, due_date || null,
      status === 'done' ? new Date().toISOString() : null);
  res.status(201).json(getProject(req.params.id));
});

app.patch('/api/tasks/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  if (b.status !== undefined && !STATUSES.includes(b.status)) return bad(res, 'Invalid status');
  if (b.priority !== undefined && !PRIORITIES.includes(b.priority)) return bad(res, 'Invalid priority');
  if (b.due_date && !isDate(b.due_date)) return bad(res, 'Due date must be YYYY-MM-DD');
  const status = b.status ?? t.status;
  const completed_at = status === 'done' ? (t.completed_at || new Date().toISOString()) : null;
  db.prepare('UPDATE tasks SET title=?, status=?, priority=?, assignee_id=?, due_date=?, completed_at=? WHERE id=?').run(
    b.title?.trim() || t.title, status, b.priority ?? t.priority,
    'assignee_id' in b ? b.assignee_id || null : t.assignee_id,
    'due_date' in b ? b.due_date || null : t.due_date, completed_at, t.id);
  res.json(getProject(t.project_id));
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// Serve built client in production
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
