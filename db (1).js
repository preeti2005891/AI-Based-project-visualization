import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const file = process.env.DB_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.db');
const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, description TEXT DEFAULT '', deadline TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
`);

// Demo data on first run
if (!db.prepare('SELECT COUNT(*) c FROM projects').get().c) {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const iso = (n) => new Date(Date.now() + n * 864e5).toISOString();
  const m = db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)');
  ['Asha', 'Ravi', 'Meera'].forEach((n) => m.run(n));
  const pid = (name, desc, dl) =>
    db.prepare('INSERT INTO projects (name,description,deadline,created_at) VALUES (?,?,?,?)').run(name, desc, day(dl), iso(-20)).lastInsertRowid;
  const t = db.prepare('INSERT INTO tasks (project_id,title,status,priority,assignee_id,due_date,completed_at) VALUES (?,?,?,?,?,?,?)');
  const a = pid('Website Redesign', 'New marketing site', 14);
  [['Wireframes', 'done', 'high', 1, -10, iso(-11)], ['Design system', 'done', 'medium', 1, -6, iso(-5)],
   ['Homepage build', 'in_progress', 'high', 2, 3, null], ['Blog templates', 'review', 'medium', 3, -1, null],
   ['SEO audit', 'todo', 'low', 3, 9, null], ['Launch checklist', 'todo', 'medium', null, 13, null]]
    .forEach(([ti, s, p, as, d, c]) => t.run(a, ti, s, p, as, day(d), c));
  const b = pid('Mobile App MVP', 'Customer-facing app', 40);
  [['API spec', 'done', 'high', 2, -8, iso(-9)], ['Auth flow', 'in_progress', 'high', 2, 6, null],
   ['Push notifications', 'todo', 'medium', 3, 25, null], ['Beta testing', 'todo', 'high', 1, 35, null]]
    .forEach(([ti, s, p, as, d, c]) => t.run(b, ti, s, p, as, day(d), c));
}
export default db;
