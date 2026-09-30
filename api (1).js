const j = async (url, opts = {}) => {
  const r = await fetch('/api' + url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.status === 204 ? null : r.json();
};
const send = (method, b) => ({ method, body: JSON.stringify(b) });

export const api = {
  members: () => j('/members'),
  addMember: (name) => j('/members', send('POST', { name })),
  delMember: (id) => j(`/members/${id}`, { method: 'DELETE' }),
  projects: () => j('/projects'),
  project: (id) => j(`/projects/${id}`),
  addProject: (b) => j('/projects', send('POST', b)),
  delProject: (id) => j(`/projects/${id}`, { method: 'DELETE' }),
  addTask: (pid, b) => j(`/projects/${pid}/tasks`, send('POST', b)),
  patchTask: (id, b) => j(`/tasks/${id}`, send('PATCH', b)),
  delTask: (id) => j(`/tasks/${id}`, { method: 'DELETE' }),
  insights: (pid) => j(`/projects/${pid}/insights`),
};
