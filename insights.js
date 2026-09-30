const DAY = 864e5;
const d0 = (s) => new Date(s.slice(0, 10) + 'T00:00:00Z').getTime();
const todayMs = () => d0(new Date().toISOString());

export function computeMetrics(project, tasks) {
  const now = todayMs();
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = open.filter((t) => t.due_date && d0(t.due_date) < now);
  const progress = total ? Math.round((done / total) * 100) : 0;
  const daysLeft = project.deadline ? Math.round((d0(project.deadline) - now) / DAY) : null;

  // velocity = tasks completed per day over the last 14 days
  const recent = tasks.filter((t) => t.completed_at && now - d0(t.completed_at) <= 14 * DAY).length;
  const velocity = recent / 14;
  const etaDays = open.length === 0 ? 0 : velocity > 0 ? Math.ceil(open.length / velocity) : null;
  const projectedFinish = etaDays == null ? null : new Date(now + etaDays * DAY).toISOString().slice(0, 10);
  const onTrack = etaDays == null || daysLeft == null ? null : etaDays <= daysLeft;

  // planned vs actual progress
  let expected = null;
  if (project.deadline) {
    const start = d0(project.created_at), end = d0(project.deadline);
    expected = end > start ? Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100))) : 100;
  }

  const load = {};
  open.forEach((t) => { const n = t.assignee_name || 'Unassigned'; load[n] = (load[n] || 0) + 1; });
  const workload = Object.entries(load).map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open);

  let score = 0;
  if (progress < 100) {
    if (daysLeft != null && daysLeft < 0) score += 3;
    if (overdue.length >= 3) score += 2; else if (overdue.length) score += 1;
    if (onTrack === false) score += 2;
    if (expected != null && progress < expected - 25) score += 2; else if (expected != null && progress < expected - 10) score += 1;
    if (workload[0] && workload[0].name !== 'Unassigned' && open.length > 3 && workload[0].open / open.length > 0.6) score += 1;
  }
  const risk = progress === 100 ? 'complete' : score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { total, done, progress, overdue: overdue.length, overdueTasks: overdue.map((t) => t.title),
    daysLeft, expected, velocity: +velocity.toFixed(2), projectedFinish, onTrack, workload, risk };
}

function ruleInsights(p, m) {
  const recs = [];
  if (m.risk === 'complete') return { summary: `${p.name} is complete. All ${m.total} tasks are done.`, recommendations: ['Hold a short retrospective and archive the project.'] };
  if (m.overdue) recs.push(`Resolve ${m.overdue} overdue task(s): ${m.overdueTasks.slice(0, 3).join(', ')}.`);
  if (m.onTrack === false) recs.push(`At the current pace the project finishes around ${m.projectedFinish}, after the deadline. Reduce scope or add capacity.`);
  const un = m.workload.find((w) => w.name === 'Unassigned');
  if (un) recs.push(`Assign owners to ${un.open} unassigned task(s).`);
  const top = m.workload.find((w) => w.name !== 'Unassigned');
  if (top && m.workload.length > 1 && top.open >= 2 * (m.workload[m.workload.length - 1].open || 1) && top.open > 2)
    recs.push(`${top.name} carries the most open work (${top.open}). Consider rebalancing.`);
  if (!recs.length) recs.push('Keep the current pace and review the board weekly.');
  const dl = m.daysLeft == null ? 'no deadline set' : m.daysLeft < 0 ? `${-m.daysLeft} day(s) past deadline` : `${m.daysLeft} day(s) to deadline`;
  const pace = m.expected != null ? ` Planned progress is about ${m.expected}%.` : '';
  return { summary: `${p.name} is ${m.progress}% complete with ${dl}.${pace} Risk level: ${m.risk}.`, recommendations: recs.slice(0, 4) };
}

async function aiInsights(p, m) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 500,
        messages: [{ role: 'user', content:
          `You are a project management assistant. Given these project metrics, write a status summary of at most 3 sentences, then exactly 3 short recommendations, each on its own line starting with "- ". Plain text, no other formatting.\n\n${JSON.stringify({ project: p.name, description: p.description, deadline: p.deadline, metrics: m })}` }],
      }),
    });
    if (!r.ok) return null;
    const text = ((await r.json()).content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const recommendations = lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
    const summary = lines.filter((l) => !l.startsWith('- ')).join(' ');
    return summary ? { summary, recommendations } : null;
  } catch { return null; }
}

export async function analyze(project, tasks) {
  const metrics = computeMetrics(project, tasks);
  const ai = await aiInsights(project, metrics);
  return { metrics, source: ai ? 'ai' : 'rules', ...(ai || ruleInsights(project, metrics)) };
}
