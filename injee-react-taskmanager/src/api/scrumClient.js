/**
 * scrumClient.js
 * Full API layer for InjeeScrum → Injee backend (http://localhost:4125)
 *
 * Collections used:
 *   /tasks    – user stories, tasks, bugs
 *   /issues   – bug reports, questions, enhancements
 *   /sprints  – sprint definitions
 *   /epics    – epic swim-lanes
 *
 * Injee auto-creates a collection on the first POST.
 * All array/object fields are stored as JSON strings.
 * Responses can be bare arrays OR { records, total_pages } — handled below.
 */

const BASE = '/api'; // proxied to http://localhost:4125 by Vite

// ─────────────────────────────────────────────
// LOW-LEVEL HTTP HELPERS
// ─────────────────────────────────────────────
const H = { 'Content-Type': 'application/json' };

const req = async (method, path, body) => {
  const opts = { method, headers: H };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${method} ${path}] HTTP ${res.status} — ${text}`);
  }
  return res.json();
};

const get    = (path)         => req('GET',    path);
const post   = (path, body)   => req('POST',   path, body);
const put    = (path, body)   => req('PUT',    path, body);
const del    = (path)         => req('DELETE', path);

// Unwrap whatever shape Injee returns for list endpoints
const rows = (data) => {
  if (Array.isArray(data))       return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data))    return data.data;
  return [];
};

const getAll = async (col, params = {}) => {
  const qs = new URLSearchParams({ per_page: 1000, ...params }).toString();
  return rows(await get(`/${col}?${qs}`));
};

// Safe JSON parse (Injee stores arrays as JSON strings)
const jp = (v, fb = []) => {
  if (Array.isArray(v)) return v;
  if (!v || v === 'null' || v === '') return fb;
  try { return JSON.parse(v); } catch { return fb; }
};

// ─────────────────────────────────────────────
// FIELD MAPPING — raw Injee record ↔ app shape
// ─────────────────────────────────────────────

// ── TASKS ────────────────────────────────────
const toTask = (r) => ({
  id:         String(r.id),
  type:       r.type        || 'task',
  title:      r.title       || '',
  desc:       r.description || '',
  status:     r.status      || 'new',
  priority:   r.priority    || 'normal',
  sprintId:   r.sprint_id   ? String(r.sprint_id) : null,
  assigneeId: r.assignee_id || null,
  pts:        Number(r.pts) || 1,
  tags:       jp(r.tags,     []),
  due:        r.due_date    || null,
  subtasks:   jp(r.subtasks, []),
  activity:   jp(r.activity, []),
  created:    (r.created_at || new Date().toISOString()).slice(0, 10),
});

const fromTask = (t) => ({
  title:       t.title,
  description: t.desc       || '',
  type:        t.type       || 'task',
  status:      t.status     || 'new',
  priority:    t.priority   || 'normal',
  sprint_id:   t.sprintId   || null,
  assignee_id: t.assigneeId || null,
  pts:         Number(t.pts) || 1,
  tags:        JSON.stringify(t.tags     || []),
  due_date:    t.due        || null,
  subtasks:    JSON.stringify(t.subtasks || []),
  activity:    JSON.stringify(t.activity || []),
});

// ── ISSUES ───────────────────────────────────
const toIssue = (r) => ({
  id:         String(r.id),
  type:       r.type        || 'bug',
  title:      r.title       || '',
  desc:       r.description || '',
  status:     r.status      || 'new',
  priority:   r.priority    || 'normal',
  assigneeId: r.assignee_id || null,
  tags:       jp(r.tags,     []),
  due:        r.due_date    || null,
  activity:   jp(r.activity, []),
  created:    (r.created_at || new Date().toISOString()).slice(0, 10),
  sel:        false,
});

const fromIssue = (i) => ({
  title:       i.title,
  description: i.desc       || '',
  type:        i.type       || 'bug',
  status:      i.status     || 'new',
  priority:    i.priority   || 'normal',
  assignee_id: i.assigneeId || null,
  tags:        JSON.stringify(i.tags     || []),
  due_date:    i.due        || null,
  activity:    JSON.stringify(i.activity || []),
});

// ── SPRINTS ──────────────────────────────────
const toSprint = (r) => ({
  id:     String(r.id),
  name:   r.name         || 'Sprint',
  start:  r.start_date   || '',
  end:    r.end_date     || '',
  status: r.status       || 'planning',
  goal:   r.goal         || '',
  pts:    Number(r.total_points) || 0,
});

const fromSprint = (s) => ({
  name:         s.name,
  start_date:   s.start,
  end_date:     s.end,
  status:       s.status || 'planning',
  goal:         s.goal   || '',
  total_points: Number(s.pts) || 0,
});

// ── EPICS ────────────────────────────────────
const toEpic = (r) => ({
  id:       String(r.id),
  name:     r.name        || 'Epic',
  color:    r.color       || '#6366f1',
  pct:      Number(r.progress) || 0,
  desc:     r.description || '',
  stories:  jp(r.linked_stories, []),
  expanded: false,
});

const fromEpic = (e) => ({
  name:           e.name,
  color:          e.color || '#6366f1',
  progress:       Number(e.pct) || 0,
  description:    e.desc  || '',
  linked_stories: JSON.stringify(e.stories || []),
});

// ─────────────────────────────────────────────
// COLLECTION APIs
// ─────────────────────────────────────────────

// ── TASKS ─────────────────────────────────────
export const tasksAPI = {
  getAll: async ()       => (await getAll('tasks')).map(toTask),

  create: async (data)   => toTask(await post('/tasks', fromTask(data))),

  // Merge current remote state with changes before PUT
  update: async (id, ch) => {
    const cur = toTask(await get(`/tasks/${id}`));
    return toTask(await put(`/tasks/${id}`, fromTask({ ...cur, ...ch })));
  },

  delete: async (id)     => del(`/tasks/${id}`),

  // Batch update — used for sprint completion
  updateMany: async (ids, ch) => {
    return Promise.all(ids.map(id => tasksAPI.update(id, ch)));
  },
};

// ── ISSUES ────────────────────────────────────
export const issuesAPI = {
  getAll: async ()       => (await getAll('issues')).map(toIssue),

  create: async (data)   => toIssue(await post('/issues', fromIssue(data))),

  update: async (id, ch) => {
    const cur = toIssue(await get(`/issues/${id}`));
    return toIssue(await put(`/issues/${id}`, fromIssue({ ...cur, ...ch })));
  },

  delete: async (id)     => del(`/issues/${id}`),
};

// ── SPRINTS ───────────────────────────────────
export const sprintsAPI = {
  getAll: async ()       => (await getAll('sprints')).map(toSprint),

  create: async (data)   => toSprint(await post('/sprints', fromSprint(data))),

  update: async (id, ch) => {
    const cur = toSprint(await get(`/sprints/${id}`));
    return toSprint(await put(`/sprints/${id}`, fromSprint({ ...cur, ...ch })));
  },
};

// ── EPICS ─────────────────────────────────────
export const epicsAPI = {
  getAll: async ()       => (await getAll('epics')).map(toEpic),

  create: async (data)   => toEpic(await post('/epics', fromEpic(data))),

  update: async (id, ch) => {
    const cur = toEpic(await get(`/epics/${id}`));
    return toEpic(await put(`/epics/${id}`, fromEpic({ ...cur, ...ch })));
  },

  delete: async (id)     => del(`/epics/${id}`),
};

// ─────────────────────────────────────────────
// LOAD ALL DATA IN PARALLEL
// ─────────────────────────────────────────────
export const loadAllData = async () => {
  const [tasks, issues, sprints, epics] = await Promise.all([
    tasksAPI.getAll(),
    issuesAPI.getAll(),
    sprintsAPI.getAll(),
    epicsAPI.getAll(),
  ]);
  return { tasks, issues, sprints, epics };
};

// ─────────────────────────────────────────────
// SEED DATA  (posted only when DB is empty)
// ─────────────────────────────────────────────
const SEED_SPRINTS = [
  { name:'Sprint 1', start:'2024-08-01', end:'2024-08-15', status:'completed', goal:'Auth & user management', pts:43 },
  { name:'Sprint 2', start:'2024-10-01', end:'2024-10-15', status:'active',    goal:'Dashboard, payments, CI/CD', pts:45 },
];

// Tasks seeded with placeholder sprint index (0 or 1) resolved after sprints are created
const SEED_TASKS = [
  // Sprint 1 — all done
  { spIdx:0, type:'story', title:'User registration flow',             status:'done', priority:'high',     assigneeId:'alice', pts:8,  tags:['auth','frontend'], due:'2024-08-10', subtasks:[{id:'s1',title:'Form UI',done:true},{id:'s2',title:'Validation',done:true}],                                                                desc:'Full registration with email verification.', activity:[] },
  { spIdx:0, type:'task',  title:'JWT auth middleware',                status:'done', priority:'critical', assigneeId:'bob',   pts:5,  tags:['auth','backend'],  due:'2024-08-08', subtasks:[],                                                                                                                                           desc:'Token generation and refresh logic.',          activity:[] },
  { spIdx:0, type:'bug',   title:'Fix CORS on /auth endpoints',        status:'done', priority:'high',     assigneeId:'bob',   pts:2,  tags:['bug','backend'],   due:'2024-08-05', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'story', title:'Password reset via email link',      status:'done', priority:'normal',   assigneeId:'alice', pts:5,  tags:['auth','email'],    due:'2024-08-12', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'task',  title:'Role-based access control',          status:'done', priority:'high',     assigneeId:'bob',   pts:5,  tags:['auth','backend'],  due:'2024-08-14', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'story', title:'User profile page',                  status:'done', priority:'normal',   assigneeId:'alice', pts:3,  tags:['frontend'],        due:'2024-08-13', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'task',  title:'Session management & logout',        status:'done', priority:'normal',   assigneeId:'dave',  pts:3,  tags:['auth'],            due:'2024-08-11', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'bug',   title:'Login redirect loop on mobile',      status:'done', priority:'critical', assigneeId:'carol', pts:3,  tags:['bug','mobile'],    due:'2024-08-06', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'task',  title:'2FA via TOTP',                       status:'done', priority:'high',     assigneeId:'bob',   pts:8,  tags:['auth','security'], due:'2024-08-15', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  { spIdx:0, type:'story', title:'Google OAuth sign-in',               status:'done', priority:'high',     assigneeId:'alice', pts:8,  tags:['auth','oauth'],    due:'2024-08-15', subtasks:[],                                                                                                                                           desc:'',                                             activity:[] },
  // Sprint 2 — active, spread across all columns
  { spIdx:1, type:'story', title:'Dashboard widget layout',            status:'new',          priority:'high',     assigneeId:'alice', pts:13, tags:['frontend','dashboard'], due:'2024-10-10', subtasks:[{id:'s3',title:'Widget grid',done:false},{id:'s4',title:'Charts',done:false},{id:'s5',title:'Filters',done:false}],           desc:'Drag-and-drop widget-based layout.',  activity:[{id:'a1',type:'created',text:'Task created',user:'Alice',time:'5d ago'}] },
  { spIdx:1, type:'task',  title:'API rate limiting middleware',       status:'new',          priority:'normal',   assigneeId:'dave',  pts:3,  tags:['backend','api'],        due:'2024-10-08', subtasks:[],                                                                                                                                           desc:'Token-bucket rate limiting.',        activity:[] },
  { spIdx:1, type:'story', title:'OAuth 2.0 login integration',        status:'in-progress',  priority:'critical', assigneeId:'alice', pts:8,  tags:['auth','oauth'],         due:'2024-10-05', subtasks:[{id:'s6',title:'Google OAuth',done:true},{id:'s7',title:'GitHub OAuth',done:false}],                                           desc:'Integrate Google + GitHub OAuth.',   activity:[{id:'a2',type:'status',text:'Moved to In Progress',user:'Alice',time:'2d ago'}] },
  { spIdx:1, type:'story', title:'User settings & preferences',        status:'in-progress',  priority:'normal',   assigneeId:'bob',   pts:5,  tags:['frontend','settings'],  due:'2024-10-09', subtasks:[{id:'s8',title:'Avatar upload',done:true},{id:'s9',title:'Preferences panel',done:false}],                                     desc:'Avatar and notification settings.',  activity:[] },
  { spIdx:1, type:'task',  title:'CI/CD pipeline with GitHub Actions', status:'ready-test',   priority:'high',     assigneeId:'dave',  pts:5,  tags:['devops','ci-cd'],       due:'2024-10-07', subtasks:[{id:'s10',title:'Build workflow',done:true},{id:'s11',title:'Deploy workflow',done:true},{id:'s12',title:'Staging env',done:false}], desc:'Automated build and deploy.',    activity:[{id:'a3',type:'status',text:'Ready for test',user:'Dave',time:'1d ago'}] },
  { spIdx:1, type:'bug',   title:'Memory leak in WebSocket handler',   status:'ready-test',   priority:'critical', assigneeId:'bob',   pts:2,  tags:['bug','backend'],        due:'2024-10-03', subtasks:[{id:'s13',title:'Reproduce',done:true},{id:'s14',title:'Fix',done:true}],                                                        desc:'Connections not closed properly.', activity:[] },
  { spIdx:1, type:'story', title:'Stripe payment checkout',            status:'ready-deploy', priority:'high',     assigneeId:'carol', pts:8,  tags:['payments','backend'],   due:'2024-10-11', subtasks:[{id:'s15',title:'Payment intent',done:true},{id:'s16',title:'Webhooks',done:true},{id:'s17',title:'Refunds',done:true}],       desc:'Stripe integration.',              activity:[{id:'a4',type:'status',text:'Ready to deploy',user:'Carol',time:'6h ago'}] },
  { spIdx:1, type:'bug',   title:'Fix 404 on production page refresh', status:'done',         priority:'normal',   assigneeId:'dave',  pts:1,  tags:['bug','devops'],         due:'2024-10-02', subtasks:[{id:'s18',title:'nginx config',done:true}],                                                                                     desc:'SPA routing fix in nginx.',        activity:[] },
  // Backlog
  { spIdx:null, type:'story', title:'Email notification system',       status:'new', priority:'normal', assigneeId:'alice', pts:5,  tags:['email'],    due:null, subtasks:[], desc:'', activity:[] },
  { spIdx:null, type:'task',  title:'DB indexing optimization',        status:'new', priority:'low',    assigneeId:'bob',   pts:3,  tags:['backend'],  due:null, subtasks:[], desc:'', activity:[] },
  { spIdx:null, type:'story', title:'Mobile responsive navigation',    status:'new', priority:'normal', assigneeId:null,    pts:5,  tags:['frontend'], due:null, subtasks:[], desc:'', activity:[] },
];

const SEED_ISSUES = [
  { type:'bug',         title:'App crashes on logout with expired token', status:'new',         priority:'critical', assigneeId:'alice', tags:['auth','critical'], due:'2024-10-05', desc:'Uncaught TypeError when JWT expires.' },
  { type:'bug',         title:'Memory leak in dashboard charts',           status:'new',         priority:'high',     assigneeId:'bob',   tags:['dashboard'],       due:'2024-10-08', desc:'Charts re-render continuously.' },
  { type:'bug',         title:'Data not persisting after page refresh',    status:'in-progress', priority:'high',     assigneeId:'carol', tags:['frontend'],         due:'2024-10-06', desc:'Form data cleared on hard refresh.' },
  { type:'bug',         title:'Login session timeout not handled',         status:'reopened',    priority:'critical', assigneeId:'dave',  tags:['auth','ux'],        due:'2024-10-04', desc:'Redirect loop found.' },
  { type:'bug',         title:'Broken nav link in sidebar',                status:'done',        priority:'normal',   assigneeId:'alice', tags:['frontend'],         due:null,          desc:'Fixed.' },
  { type:'enhancement', title:'Dark / light theme toggle',                 status:'new',         priority:'normal',   assigneeId:'bob',   tags:['ui','theme'],       due:null,          desc:'Allow users to switch themes.' },
  { type:'enhancement', title:'Fuzzy search across all entities',          status:'in-progress', priority:'high',     assigneeId:'carol', tags:['search','ux'],      due:'2024-10-12', desc:'Current search is exact match only.' },
  { type:'enhancement', title:'Export tasks to CSV / PDF',                 status:'new',         priority:'low',      assigneeId:'dave',  tags:['export'],           due:null,          desc:'Users need to export task lists.' },
  { type:'question',    title:'API pagination — cursor vs offset?',        status:'new',         priority:'normal',   assigneeId:'alice', tags:['api','docs'],       due:null,          desc:'Docs unclear about pagination.' },
  { type:'question',    title:'File upload size limit strategy?',          status:'new',         priority:'low',      assigneeId:'bob',   tags:['upload'],           due:null,          desc:'Client-side vs server-side?' },
];

// Seed epic definitions — stories linked after tasks are created
const SEED_EPICS_DEF = [
  { name:'Authentication Module',  color:'#6366f1', pct:80, desc:'Full auth system.',       storyTitles:['User registration flow','JWT auth middleware','Fix CORS on /auth endpoints','Password reset via email link','Role-based access control','Google OAuth sign-in'] },
  { name:'Dashboard Redesign',     color:'#0891b2', pct:40, desc:'Widget-based dashboard.', storyTitles:['Dashboard widget layout','User profile page','User settings & preferences'] },
  { name:'API Integration',        color:'#a855f7', pct:10, desc:'Third-party API work.',   storyTitles:['API rate limiting middleware','Stripe payment checkout','DB indexing optimization'] },
];

/**
 * Seed the database with initial data.
 * Called only when sprints collection is empty.
 */
export const seedDatabase = async () => {
  console.log('[Seed] Populating Injee database with initial data…');

  // 1. Create sprints
  const sp1 = await sprintsAPI.create(SEED_SPRINTS[0]);
  const sp2 = await sprintsAPI.create(SEED_SPRINTS[1]);
  const sprintIds = [sp1.id, sp2.id]; // index 0 = sp1, index 1 = sp2

  // 2. Create tasks (resolve sprint index → real sprint id)
  const createdTasks = await Promise.all(
    SEED_TASKS.map(t =>
      tasksAPI.create({
        ...t,
        sprintId: t.spIdx != null ? sprintIds[t.spIdx] : null,
      })
    )
  );

  // 3. Create issues
  await Promise.all(
    SEED_ISSUES.map(i =>
      issuesAPI.create({ ...i, activity: [] })
    )
  );

  // 4. Create epics — link task IDs by title match
  const titleToId = {};
  createdTasks.forEach(t => { titleToId[t.title] = t.id; });

  await Promise.all(
    SEED_EPICS_DEF.map(e =>
      epicsAPI.create({
        name:     e.name,
        color:    e.color,
        pct:      e.pct,
        desc:     e.desc,
        stories:  e.storyTitles.map(title => titleToId[title]).filter(Boolean),
      })
    )
  );

  console.log('[Seed] Done. Database seeded successfully.');
};

/**
 * Check if DB is empty and seed if needed.
 * Returns true if seeding was performed.
 */
export const initDatabase = async () => {
  const sprints = await sprintsAPI.getAll();
  if (sprints.length > 0) return false;   // already seeded
  await seedDatabase();
  return true;
};

// ─────────────────────────────────────────────
// BUSINESS LOGIC HELPERS
// ─────────────────────────────────────────────

/**
 * Complete a sprint:
 *  - Mark sprint as 'completed'
 *  - Move all non-done tasks in that sprint to 'archived'
 */
export const completeSprint = async (sprintId, tasks) => {
  await sprintsAPI.update(sprintId, { status: 'completed' });

  const toArchive = tasks.filter(
    t => t.sprintId === sprintId && !['done', 'archived'].includes(t.status)
  );
  if (toArchive.length > 0) {
    await tasksAPI.updateMany(toArchive.map(t => t.id), { status: 'archived' });
  }
  return toArchive.map(t => t.id); // IDs that were archived
};

/**
 * Reopen an issue:
 *  - status → 'reopened'
 *  - Append activity entry
 */
export const reopenIssue = async (issueId, issue) => {
  const entry = { id: `act-${Date.now()}`, type:'status', text:'Issue reopened', user:'You', time:'just now' };
  return issuesAPI.update(issueId, {
    status:   'reopened',
    activity: [entry, ...(issue.activity || [])],
  });
};

/**
 * Recalculate epic progress based on linked tasks.
 * progress = done tasks / total linked tasks * 100
 */
export const recalcEpicProgress = async (epic, tasks) => {
  const linked = tasks.filter(t => (epic.stories || []).includes(t.id));
  if (linked.length === 0) return epic;
  const done = linked.filter(t => t.status === 'done').length;
  const pct  = Math.round((done / linked.length) * 100);
  if (pct === epic.pct) return epic;
  return epicsAPI.update(epic.id, { pct });
};
