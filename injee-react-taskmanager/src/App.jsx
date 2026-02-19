import React, { useState, useReducer, useRef, useEffect, useMemo } from 'react';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const COLUMNS = [
  { id: 'new',           label: 'To Do',              color: '#9ca3af' },
  { id: 'in-progress',   label: 'In Progress',        color: '#6366f1' },
  { id: 'ready-test',    label: 'Ready for Test',     color: '#f97316' },
  { id: 'ready-deploy',  label: 'Ready to Deploy',    color: '#a855f7' },
  { id: 'done',          label: 'Done',               color: '#16a34a' },
  { id: 'archived',      label: 'Archived',           color: '#9ca3af' },
];

const PRIORITIES = [
  { id: 'critical', label: 'Critical', icon: '🔴', color: '#ef4444' },
  { id: 'high',     label: 'High',     icon: '🟠', color: '#f97316' },
  { id: 'normal',   label: 'Normal',   icon: '🔵', color: '#6366f1' },
  { id: 'low',      label: 'Low',      icon: '🟢', color: '#22c55e' },
  { id: 'wishlist', label: 'Wishlist', icon: '⚪', color: '#a855f7' },
];

const TASK_TYPES = [
  { id: 'story', label: 'Story', icon: '📖' },
  { id: 'task',  label: 'Task',  icon: '✅' },
  { id: 'bug',   label: 'Bug',   icon: '🐛' },
];

const ISSUE_TYPES = [
  { id: 'bug',         label: 'Bug',         icon: '🐛' },
  { id: 'question',    label: 'Question',    icon: '❓' },
  { id: 'enhancement', label: 'Enhancement', icon: '✨' },
];

const MEMBERS = [
  { id: 'alice', name: 'Alice Chen',   role: 'Frontend Dev', color: '#6366f1' },
  { id: 'bob',   name: 'Bob Martinez', role: 'Backend Dev',  color: '#0891b2' },
  { id: 'carol', name: 'Carol Smith',  role: 'QA Engineer',  color: '#a855f7' },
  { id: 'dave',  name: 'Dave Johnson', role: 'DevOps',       color: '#ea580c' },
];

const TAG_PALETTE = [
  { bg: '#ede9fe', color: '#7c3aed' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#e0f2fe', color: '#0369a1' },
];

// helpers
const getCol   = id => COLUMNS.find(c => c.id === id)    || COLUMNS[0];
const getPri   = id => PRIORITIES.find(p => p.id === id) || PRIORITIES[2];
const getMbr   = id => MEMBERS.find(m => m.id === id);
const getTType = id => TASK_TYPES.find(t => t.id === id) || TASK_TYPES[1];
const getIType = id => ISSUE_TYPES.find(t => t.id === id) || ISSUE_TYPES[0];
const tagColor = tag => TAG_PALETTE[
  Math.abs(tag.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % TAG_PALETTE.length
];

let _n = 200;
const uid = p => `${p}-${++_n}`;

// ─────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────
const SPRINTS = [
  { id: 'sp1', name: 'Sprint 1', start: '2024-08-01', end: '2024-08-15', status: 'completed', goal: 'Auth & user management', pts: 43 },
  { id: 'sp2', name: 'Sprint 2', start: '2024-10-01', end: '2024-10-15', status: 'active',    goal: 'Dashboard, payments, CI/CD',  pts: 45 },
];

const INIT_TASKS = [
  // Sprint 1 – all done
  { id:'T-011', type:'story', title:'User registration flow',            status:'done', priority:'high',     sprintId:'sp1', assigneeId:'alice', pts:8,  tags:['auth','frontend'], due:'2024-08-10', subtasks:[{id:'s1',title:'Form UI',done:true},{id:'s2',title:'Validation',done:true}], desc:'Full registration with email verification.', activity:[], created:'2024-07-28' },
  { id:'T-012', type:'task',  title:'JWT auth middleware',               status:'done', priority:'critical', sprintId:'sp1', assigneeId:'bob',   pts:5,  tags:['auth','backend'],  due:'2024-08-08', subtasks:[],                                                                         desc:'Token generation and refresh logic.',         activity:[], created:'2024-07-28' },
  { id:'T-013', type:'bug',   title:'Fix CORS on /auth endpoints',       status:'done', priority:'high',     sprintId:'sp1', assigneeId:'bob',   pts:2,  tags:['bug','backend'],   due:'2024-08-05', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-07-29' },
  { id:'T-014', type:'story', title:'Password reset via email',          status:'done', priority:'normal',   sprintId:'sp1', assigneeId:'alice', pts:5,  tags:['auth','email'],    due:'2024-08-12', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-07-29' },
  { id:'T-015', type:'task',  title:'Role-based access control',         status:'done', priority:'high',     sprintId:'sp1', assigneeId:'bob',   pts:5,  tags:['auth','backend'],  due:'2024-08-14', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-07-30' },
  { id:'T-016', type:'story', title:'User profile page',                 status:'done', priority:'normal',   sprintId:'sp1', assigneeId:'alice', pts:3,  tags:['frontend'],        due:'2024-08-13', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-07-30' },
  { id:'T-017', type:'task',  title:'Session management & logout',       status:'done', priority:'normal',   sprintId:'sp1', assigneeId:'dave',  pts:3,  tags:['auth'],            due:'2024-08-11', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-07-31' },
  { id:'T-018', type:'bug',   title:'Login redirect loop on mobile',     status:'done', priority:'critical', sprintId:'sp1', assigneeId:'carol', pts:3,  tags:['bug','mobile'],    due:'2024-08-06', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-08-01' },
  { id:'T-019', type:'task',  title:'2FA via TOTP',                      status:'done', priority:'high',     sprintId:'sp1', assigneeId:'bob',   pts:8,  tags:['auth','security'], due:'2024-08-15', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-08-01' },
  { id:'T-020', type:'story', title:'Google OAuth sign-in',              status:'done', priority:'high',     sprintId:'sp1', assigneeId:'alice', pts:8,  tags:['auth','oauth'],    due:'2024-08-15', subtasks:[],                                                                         desc:'',                                            activity:[], created:'2024-08-02' },
  // Sprint 2 – active, spread across columns
  { id:'T-001', type:'story', title:'Dashboard widget layout',           status:'new',          priority:'high',     sprintId:'sp2', assigneeId:'alice', pts:13, tags:['frontend','dashboard'], due:'2024-10-10', subtasks:[{id:'s3',title:'Widget grid',done:false},{id:'s4',title:'Charts',done:false},{id:'s5',title:'Filters',done:false}], desc:'Drag-and-drop widget-based dashboard layout.', activity:[{id:'a1',type:'created',text:'Task created',user:'Alice',time:'5d ago'}], created:'2024-09-25' },
  { id:'T-002', type:'task',  title:'API rate limiting middleware',      status:'new',          priority:'normal',   sprintId:'sp2', assigneeId:'dave',  pts:3,  tags:['backend','api'],        due:'2024-10-08', subtasks:[], desc:'Token-bucket rate limiting on all public endpoints.', activity:[], created:'2024-09-25' },
  { id:'T-003', type:'story', title:'OAuth 2.0 login integration',       status:'in-progress',  priority:'critical', sprintId:'sp2', assigneeId:'alice', pts:8,  tags:['auth','oauth'],         due:'2024-10-05', subtasks:[{id:'s6',title:'Google OAuth',done:true},{id:'s7',title:'GitHub OAuth',done:false}], desc:'Integrate Google + GitHub OAuth.', activity:[{id:'a2',type:'status',text:'Moved to In Progress',user:'Alice',time:'2d ago'}], created:'2024-09-26' },
  { id:'T-004', type:'story', title:'User settings & preferences',       status:'in-progress',  priority:'normal',   sprintId:'sp2', assigneeId:'bob',   pts:5,  tags:['frontend','settings'],  due:'2024-10-09', subtasks:[{id:'s8',title:'Avatar upload',done:true},{id:'s9',title:'Preferences panel',done:false}], desc:'User profile with avatar and notification settings.', activity:[], created:'2024-09-26' },
  { id:'T-005', type:'task',  title:'CI/CD pipeline with GitHub Actions',status:'ready-test',   priority:'high',     sprintId:'sp2', assigneeId:'dave',  pts:5,  tags:['devops','ci-cd'],       due:'2024-10-07', subtasks:[{id:'s10',title:'Build workflow',done:true},{id:'s11',title:'Deploy workflow',done:true},{id:'s12',title:'Staging env',done:false}], desc:'Automated build and deploy pipeline.', activity:[{id:'a3',type:'status',text:'Moved to Ready for Test',user:'Dave',time:'1d ago'}], created:'2024-09-27' },
  { id:'T-006', type:'bug',   title:'Memory leak in WebSocket handler',  status:'ready-test',   priority:'critical', sprintId:'sp2', assigneeId:'bob',   pts:2,  tags:['bug','backend'],        due:'2024-10-03', subtasks:[{id:'s13',title:'Reproduce',done:true},{id:'s14',title:'Fix',done:true}], desc:'Connections not closed properly, memory grows unbounded.', activity:[], created:'2024-09-28' },
  { id:'T-007', type:'story', title:'Stripe payment checkout',           status:'ready-deploy', priority:'high',     sprintId:'sp2', assigneeId:'carol', pts:8,  tags:['payments','backend'],   due:'2024-10-11', subtasks:[{id:'s15',title:'Payment intent',done:true},{id:'s16',title:'Webhooks',done:true},{id:'s17',title:'Refunds',done:true}], desc:'Full Stripe integration with webhook handling.', activity:[{id:'a4',type:'status',text:'Ready for deployment',user:'Carol',time:'6h ago'}], created:'2024-09-25' },
  { id:'T-008', type:'bug',   title:'Fix 404 on production refresh',     status:'done',         priority:'normal',   sprintId:'sp2', assigneeId:'dave',  pts:1,  tags:['bug','devops'],         due:'2024-10-02', subtasks:[{id:'s18',title:'nginx config',done:true}], desc:'SPA routing breaks on hard refresh in production.', activity:[], created:'2024-09-29' },
  // Backlog (no sprint)
  { id:'T-021', type:'story', title:'Email notification system',         status:'new', priority:'normal', sprintId:null, assigneeId:'alice', pts:5,  tags:['email','notifications'], due:null, subtasks:[], desc:'', activity:[], created:'2024-09-20' },
  { id:'T-022', type:'task',  title:'DB indexing optimization',          status:'new', priority:'low',    sprintId:null, assigneeId:'bob',   pts:3,  tags:['backend','perf'],        due:null, subtasks:[], desc:'', activity:[], created:'2024-09-21' },
  { id:'T-023', type:'story', title:'Mobile responsive navigation',      status:'new', priority:'normal', sprintId:null, assigneeId:null,    pts:5,  tags:['frontend','mobile'],     due:null, subtasks:[], desc:'', activity:[], created:'2024-09-22' },
];

const INIT_ISSUES = [
  { id:'I-001', type:'bug',         title:'App crashes on logout with expired token', status:'new',         priority:'critical', assigneeId:'alice', tags:['auth','critical'], due:'2024-10-05', created:'2024-09-28', sel:false, desc:'Uncaught TypeError when JWT expires and user clicks logout.', activity:[] },
  { id:'I-002', type:'bug',         title:'Memory leak in dashboard charts',           status:'new',         priority:'high',     assigneeId:'bob',   tags:['dashboard','perf'], due:'2024-10-08', created:'2024-09-29', sel:false, desc:'Charts re-render continuously, memory grows unchecked.', activity:[] },
  { id:'I-003', type:'bug',         title:'Data not persisting after page refresh',    status:'in-progress', priority:'high',     assigneeId:'carol', tags:['frontend'],         due:'2024-10-06', created:'2024-09-30', sel:false, desc:'Form data cleared on hard refresh.', activity:[{id:'a5',type:'status',text:'Investigation started',user:'Carol',time:'1d ago'}] },
  { id:'I-004', type:'bug',         title:'Login session timeout not handled',         status:'reopened',    priority:'critical', assigneeId:'dave',  tags:['auth','ux'],        due:'2024-10-04', created:'2024-09-25', sel:false, desc:'REOPENED: Previous fix introduced a redirect loop.', activity:[{id:'a6',type:'status',text:'Reopened — redirect loop found',user:'Dave',time:'3h ago'}] },
  { id:'I-005', type:'bug',         title:'Broken nav link in sidebar',                status:'done',        priority:'normal',   assigneeId:'alice', tags:['frontend','nav'],   due:'2024-09-30', created:'2024-09-27', sel:false, desc:'Fixed.', activity:[] },
  { id:'I-006', type:'enhancement', title:'Dark / light theme toggle',                 status:'new',         priority:'normal',   assigneeId:'bob',   tags:['ui','theme'],       due:null,          created:'2024-09-26', sel:false, desc:'Allow users to switch themes.', activity:[] },
  { id:'I-007', type:'enhancement', title:'Fuzzy search across all entities',          status:'in-progress', priority:'high',     assigneeId:'carol', tags:['search','ux'],      due:'2024-10-12', created:'2024-09-27', sel:false, desc:'Current search is exact match only.', activity:[] },
  { id:'I-008', type:'enhancement', title:'Export tasks to CSV / PDF',                 status:'new',         priority:'low',      assigneeId:'dave',  tags:['export'],           due:null,          created:'2024-09-28', sel:false, desc:'Users need to export task lists.', activity:[] },
  { id:'I-009', type:'question',    title:'API pagination format — cursor vs offset?', status:'new',         priority:'normal',   assigneeId:'alice', tags:['api','docs'],       due:null,          created:'2024-09-29', sel:false, desc:'Docs unclear about pagination approach.', activity:[] },
  { id:'I-010', type:'question',    title:'File upload size limit strategy?',          status:'new',         priority:'low',      assigneeId:'bob',   tags:['upload','api'],     due:null,          created:'2024-09-30', sel:false, desc:'Client-side vs server-side validation?', activity:[] },
];

const INIT_EPICS = [
  { id:'e1', name:'Authentication Module',  color:'#6366f1', pct:80, expanded:false, stories:['T-011','T-012','T-013','T-014','T-015','T-020'], desc:'Full auth system.' },
  { id:'e2', name:'Dashboard Redesign',     color:'#0891b2', pct:40, expanded:false, stories:['T-001','T-016','T-004'],                         desc:'Widget-based dashboard.' },
  { id:'e3', name:'API Integration',        color:'#a855f7', pct:10, expanded:false, stories:['T-002','T-007','T-022'],                         desc:'Third-party API integrations.' },
];

// ─────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────
const init = {
  sidebarCollapsed: false,
  view: 'dashboard',
  activeSprint: 'sp2',
  tasks: INIT_TASKS,
  issues: INIT_ISSUES,
  epics: INIT_EPICS,
  sprints: SPRINTS,
  drawer: null,       // { item, kind }
  notifs: 4,
  search: '',
};

function reducer(s, a) {
  switch (a.type) {
    case 'SIDEBAR': return { ...s, sidebarCollapsed: !s.sidebarCollapsed };
    case 'VIEW':    return { ...s, view: a.v };
    case 'SPRINT':  return { ...s, activeSprint: a.id };
    case 'SEARCH':  return { ...s, search: a.q };

    case 'OPEN_DRAWER':  return { ...s, drawer: { item: a.item, kind: a.kind } };
    case 'CLOSE_DRAWER': return { ...s, drawer: null };
    case 'UPDATE_DRAWER': {
      if (!s.drawer) return s;
      const upd = { ...s.drawer.item, ...a.ch };
      const tasks  = s.tasks.map(t  => t.id  === upd.id ? upd : t);
      const issues = s.issues.map(i => i.id  === upd.id ? upd : i);
      return { ...s, drawer: { ...s.drawer, item: upd }, tasks, issues };
    }

    case 'MOVE_TASK': {
      const act = { id: uid('act'), type:'status', text:`Moved to ${getCol(a.to).label}`, user:'You', time:'just now' };
      const tasks = s.tasks.map(t => t.id === a.id
        ? { ...t, status: a.to, activity: [act, ...t.activity] } : t);
      const drawer = s.drawer?.item?.id === a.id
        ? { ...s.drawer, item: tasks.find(t => t.id === a.id) } : s.drawer;
      return { ...s, tasks, drawer };
    }

    case 'CREATE_TASK': {
      const t = { id: uid('T'), type: a.ttype||'task', title: a.title, status: a.status||'new',
        priority:'normal', sprintId: a.sprintId, assigneeId:null, pts:1, tags:[], due:null,
        subtasks:[], desc:'', activity:[{ id:uid('act'), type:'created', text:'Task created', user:'You', time:'just now' }],
        created: new Date().toISOString().slice(0,10) };
      return { ...s, tasks: [...s.tasks, t] };
    }

    case 'UPDATE_TASK': {
      const tasks = s.tasks.map(t => t.id === a.id ? { ...t, ...a.ch } : t);
      const drawer = s.drawer?.item?.id === a.id
        ? { ...s.drawer, item: { ...s.drawer.item, ...a.ch } } : s.drawer;
      return { ...s, tasks, drawer };
    }

    case 'DELETE_TASK': {
      const drawer = s.drawer?.item?.id === a.id ? null : s.drawer;
      return { ...s, tasks: s.tasks.filter(t => t.id !== a.id), drawer };
    }

    case 'MOVE_TO_SPRINT':
      return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, sprintId: a.sprintId, status:'new' } : t) };

    case 'ADD_SUBTASK': {
      const st = { id: uid('st'), title: a.title, done: false };
      return {
        ...s,
        tasks: s.tasks.map(t => t.id === a.taskId ? { ...t, subtasks: [...t.subtasks, st] } : t),
        drawer: s.drawer?.item?.id === a.taskId
          ? { ...s.drawer, item: { ...s.drawer.item, subtasks: [...s.drawer.item.subtasks, st] } }
          : s.drawer,
      };
    }

    case 'TOGGLE_SUBTASK': {
      const toggle = sub => sub.map(st => st.id === a.stId ? { ...st, done: !st.done } : st);
      return {
        ...s,
        tasks: s.tasks.map(t => t.id === a.taskId ? { ...t, subtasks: toggle(t.subtasks) } : t),
        drawer: s.drawer?.item?.id === a.taskId
          ? { ...s.drawer, item: { ...s.drawer.item, subtasks: toggle(s.drawer.item.subtasks) } }
          : s.drawer,
      };
    }

    case 'CREATE_ISSUE': {
      const i = { id: uid('I'), type: a.itype||'bug', title: a.title, status:'new',
        priority:'normal', assigneeId:null, tags:[], due:null, sel:false, desc:'',
        activity:[{ id:uid('act'), type:'created', text:'Issue created', user:'You', time:'just now' }],
        created: new Date().toISOString().slice(0,10) };
      return { ...s, issues: [i, ...s.issues] };
    }

    case 'UPDATE_ISSUE': {
      const issues = s.issues.map(i => i.id === a.id ? { ...i, ...a.ch } : i);
      const drawer = s.drawer?.item?.id === a.id
        ? { ...s.drawer, item: { ...s.drawer.item, ...a.ch } } : s.drawer;
      return { ...s, issues, drawer };
    }

    case 'DELETE_ISSUE': {
      const drawer = s.drawer?.item?.id === a.id ? null : s.drawer;
      return { ...s, issues: s.issues.filter(i => i.id !== a.id), drawer };
    }

    case 'TOGGLE_SEL':
      return { ...s, issues: s.issues.map(i => i.id === a.id ? { ...i, sel: !i.sel } : i) };

    case 'BULK_ISSUES': {
      if (a.op === 'delete') return { ...s, issues: s.issues.filter(i => !i.sel) };
      return { ...s, issues: s.issues.map(i => i.sel ? { ...i, [a.field]: a.val, sel: false } : i) };
    }

    case 'TOGGLE_EPIC':
      return { ...s, epics: s.epics.map(e => e.id === a.id ? { ...e, expanded: !e.expanded } : e) };

    case 'CREATE_EPIC': {
      const cols = ['#6366f1','#0891b2','#a855f7','#ea580c','#16a34a','#ef4444'];
      const e = { id: uid('e'), name: a.name, color: cols[s.epics.length % cols.length], pct:0, expanded:false, stories:[], desc:'' };
      return { ...s, epics: [...s.epics, e] };
    }

    case 'ADD_COMMENT': {
      const c = { id: uid('act'), type:'comment', text: a.text, user:'You', time:'just now' };
      const tasks  = s.tasks.map(t  => t.id  === a.id ? { ...t,  activity: [c, ...t.activity]  } : t);
      const issues = s.issues.map(i => i.id  === a.id ? { ...i,  activity: [c, ...i.activity]  } : i);
      const drawer = s.drawer?.item?.id === a.id
        ? { ...s.drawer, item: { ...s.drawer.item, activity: [c, ...s.drawer.item.activity] } }
        : s.drawer;
      return { ...s, tasks, issues, drawer };
    }

    case 'COMPLETE_SPRINT':
      return { ...s, sprints: s.sprints.map(sp => sp.id === a.id ? { ...sp, status:'completed' } : sp) };

    case 'NEW_SPRINT': {
      const sp = { id: uid('sp'), name: `Sprint ${s.sprints.length + 1}`,
        start: new Date().toISOString().slice(0,10),
        end: new Date(Date.now()+14*86400000).toISOString().slice(0,10),
        status:'planning', goal:'', pts:0 };
      return { ...s, sprints: [...s.sprints, sp] };
    }

    default: return s;
  }
}

// ─────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────
function Av({ id, size = 'md', tip = false }) {
  const m = getMbr(id);
  const el = (
    <div className={`av av-${size}`} style={{ background: m ? m.color : '#9ca3af' }}>
      {m ? m.name[0] : '?'}
    </div>
  );
  if (!tip || !m) return el;
  return <div className="tip">{el}<div className="tip-box">{m.name}</div></div>;
}

function PBadge({ id, label = false }) {
  const p = getPri(id);
  return (
    <span className="p-badge" style={{ background: `${p.color}18`, color: p.color }}>
      {p.icon}{label && ` ${p.label}`}
    </span>
  );
}

function SDot({ status, size = 9 }) {
  const c = status === 'reopened' ? '#ef4444' : getCol(status).color;
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:c, flexShrink:0 }} />;
}

function Tag({ t }) {
  const tc = tagColor(t);
  return <span className="tag" style={{ background: tc.bg, color: tc.color }}>{t}</span>;
}

function Divider() { return <div className="divider" />; }

// ─────────────────────────────────────────────
// BURNDOWN CHART
// ─────────────────────────────────────────────
function Burndown({ sprint }) {
  const total = sprint?.pts || 45;
  const days  = 14;
  const ideal  = Array.from({ length: days+1 }, (_,i) => total - (total/days)*i);
  const actual = [45,43,41,40,37,33,30,26,24,22,18,14,10,7,4];
  const W = 600, H = 72;
  const x = i => (i/days)*W;
  const y = v => H - (v/total)*(H-6) - 2;
  const path = pts => pts.map((v,i) => `${i?'L':'M'} ${x(i)} ${y(v)}`).join(' ');

  return (
    <svg className="burndown-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0,0.25,0.5,0.75,1].map(f => (
        <line key={f} x1={0} y1={y(f*total)} x2={W} y2={y(f*total)} stroke="#e5e7eb" strokeWidth="0.6"/>
      ))}
      <path d={path(ideal)} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 4"/>
      <path d={`${path(actual)} L ${x(days)} ${H} L 0 ${H} Z`} fill="rgba(99,102,241,0.08)"/>
      <path d={path(actual)} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"
        style={{ strokeDasharray:1000, strokeDashoffset:1000, animation:'drawLine 1.4s ease forwards' }}/>
      <circle cx={x(10)} cy={y(actual[10])} r={4} fill="#6366f1"/>
      <style>{`@keyframes drawLine{to{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}

// ─────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────
function TaskCard({ task, onOpen, onDelete, dragRef }) {
  const [dragging, setDragging] = useState(false);
  const type   = getTType(task.type);
  const done   = task.subtasks.filter(s => s.done).length;
  const total  = task.subtasks.length;
  const pct    = total ? (done/total)*100 : 0;
  const overdue = task.due && new Date(task.due) < new Date();
  const accentColor = getCol(task.status).color;

  return (
    <div
      className={`task-card${dragging ? ' dragging' : ''}`}
      style={{ '--card-accent': accentColor }}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed='move'; dragRef.current={id:task.id,from:task.status}; setDragging(true); }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(task, 'task')}
    >
      <div className="hover-actions" onClick={e => e.stopPropagation()}>
        <button className="ha-btn" onClick={() => onOpen(task,'task')}>✏️</button>
        <button className="ha-btn del" onClick={() => onDelete(task.id)}>🗑</button>
      </div>

      <div className="tc-top">
        <div className="tc-meta">
          <span className="tc-type-icon">{type.icon}</span>
          <span className="id-chip">{task.id}</span>
        </div>
        <div className="pts-badge">{task.pts}</div>
      </div>

      <div className="tc-title">{task.title}</div>

      {task.tags.length > 0 && (
        <div className="tc-tags">{task.tags.slice(0,3).map(t => <Tag key={t} t={t}/>)}</div>
      )}

      <div className="tc-foot">
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <PBadge id={task.priority}/>
          {task.assigneeId && (
            <div className="tc-assignees"><Av id={task.assigneeId} size="xs" tip/></div>
          )}
        </div>
        {task.due && (
          <span className={`due-label${overdue?' overdue':''}`}>
            {overdue?'⚠ ':''}{task.due}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="progress-bar">
          <div className="pb-bg"><div className="pb-fill" style={{ width:`${pct}%`, background: accentColor }}/></div>
          <div className="pb-text">{done}/{total} subtasks</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KANBAN COLUMN
// ─────────────────────────────────────────────
function KanbanCol({ col, tasks, dispatch, dragRef, onOpen }) {
  const [over, setOver]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle]   = useState('');

  const drop = e => {
    e.preventDefault();
    setOver(false);
    const { id, from } = dragRef.current || {};
    if (id && from !== col.id) dispatch({ type:'MOVE_TASK', id, to: col.id });
    dragRef.current = null;
  };

  const confirm = () => {
    if (title.trim()) dispatch({ type:'CREATE_TASK', title:title.trim(), status:col.id, sprintId:null });
    setAdding(false); setTitle('');
  };

  return (
    <div
      className={`k-col${over?' drag-over':''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <div className="k-col-head">
        <span className="k-col-dot" style={{ background: col.color }}/>
        <span className="k-col-title" style={{ color: col.color }}>{col.label}</span>
        <span className="count-chip">{tasks.length}</span>
      </div>

      <div className="k-cards">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onOpen={onOpen}
            onDelete={id => dispatch({ type:'DELETE_TASK', id })}
            dragRef={dragRef}/>
        ))}
        {adding && (
          <div>
            <input autoFocus className="quick-input" placeholder="Task title…"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') confirm(); if(e.key==='Escape'){setAdding(false);setTitle('');} }}/>
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <button className="btn btn-primary btn-sm" onClick={confirm}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setTitle(''); }}>✕</button>
            </div>
          </div>
        )}
      </div>

      <div className="k-add-row">
        <button className="k-add-btn" onClick={() => setAdding(true)}>＋ Add task</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPRINT BOARD
// ─────────────────────────────────────────────
function SprintBoard({ state, dispatch }) {
  const [showBurn, setShowBurn] = useState(false);
  const dragRef = useRef(null);

  const sprint = state.sprints.find(s => s.id === state.activeSprint) || state.sprints[1];
  const tasks  = state.tasks.filter(t => t.sprintId === state.activeSprint);
  const done   = tasks.filter(t => t.status === 'done').length;
  const pts    = tasks.reduce((a,t) => a + (t.pts||0), 0);
  const burned = tasks.filter(t => t.status === 'done').reduce((a,t) => a + (t.pts||0), 0);

  const open = (item, kind) => dispatch({ type:'OPEN_DRAWER', item, kind });

  return (
    <div className="sprint-view">
      {/* Toolbar */}
      <div className="sprint-toolbar">
        <div className="sprint-title-row">
          <div>
            <div className="sprint-name">{sprint.name}</div>
            <div className="sprint-dates">{sprint.start} → {sprint.end}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type:'NEW_SPRINT' })}>＋ New Sprint</button>
            {sprint.status === 'active' && (
              <button className="btn btn-teal btn-sm" onClick={() => dispatch({ type:'COMPLETE_SPRINT', id: state.activeSprint })}>
                ✓ Complete Sprint
              </button>
            )}
          </div>
        </div>

        <div className="sprint-meta-row">
          <span className="sprint-stat"><b>{tasks.length}</b> stories</span>
          <span className="sprint-stat"><b style={{color:'#16a34a'}}>{done}</b> done</span>
          <span className="sprint-stat"><b style={{color:'#6366f1'}}>{pts}</b> pts</span>
          <span className="sprint-stat"><b style={{color:'#0891b2'}}>{burned}</b> burned</span>
          {sprint.status === 'active' && (
            <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, padding:'2px 10px',
              background:'#dcfce7', color:'#15803d', borderRadius:10, border:'1px solid #bbf7d0' }}>
              ACTIVE
            </span>
          )}
        </div>

        <div className="sprint-tabs">
          {state.sprints.map(sp => (
            <button key={sp.id}
              className={`sprint-tab${sp.id === state.activeSprint ? ' active' : ''}`}
              onClick={() => dispatch({ type:'SPRINT', id: sp.id })}>
              {sp.name} {sp.status === 'active' ? '🟢' : sp.status === 'completed' ? '✓' : '📋'}
            </button>
          ))}
        </div>
      </div>

      {/* Burndown */}
      <div className="burndown-section">
        <button className="burndown-toggle" onClick={() => setShowBurn(v => !v)}>
          {showBurn ? '▼' : '▶'} Burndown Chart
        </button>
        {showBurn && <div className="burndown-body"><Burndown sprint={sprint}/></div>}
      </div>

      {/* Board */}
      <div className="kanban-board">
        {COLUMNS.map(col => (
          <KanbanCol key={col.id} col={col}
            tasks={tasks.filter(t => t.status === col.id)}
            dispatch={dispatch} dragRef={dragRef} onOpen={open}/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BACKLOG
// ─────────────────────────────────────────────
function Backlog({ state, dispatch }) {
  const [collapsed, setCollapsed] = useState({});
  const [filters, setFilters]     = useState({ assignee:'', priority:'', status:'' });
  const [adding, setAdding]       = useState(null);
  const [newTitle, setNewTitle]   = useState('');
  const dragRef = useRef(null);

  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const filtered = state.tasks.filter(t => {
    if (filters.assignee && t.assigneeId !== filters.assignee) return false;
    if (filters.priority && t.priority   !== filters.priority) return false;
    if (filters.status   && t.status     !== filters.status)   return false;
    return true;
  });

  const groups = [
    ...state.sprints.map(sp => ({
      id: sp.id, label: sp.name, status: sp.status,
      tasks: filtered.filter(t => t.sprintId === sp.id),
    })),
    { id:'unassigned', label:'Unassigned / Backlog', status:'none',
      tasks: filtered.filter(t => !t.sprintId) },
  ];

  const toggle = id => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const addStory = grpId => {
    if (newTitle.trim()) {
      dispatch({ type:'CREATE_TASK', title:newTitle.trim(),
        sprintId: grpId === 'unassigned' ? null : grpId, ttype:'story', status:'new' });
    }
    setAdding(null); setNewTitle('');
  };

  return (
    <div className="backlog-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">Product Backlog</div>
          <div className="page-subtitle">All user stories, tasks and bugs across sprints</div>
        </div>
        <button className="btn btn-primary"
          onClick={() => dispatch({ type:'CREATE_TASK', title:'New User Story', ttype:'story', sprintId:null, status:'new' })}>
          ＋ New Story
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Filter:</span>
        <select className="filter-select" value={filters.assignee} onChange={e => sf('assignee', e.target.value)}>
          <option value="">All Assignees</option>
          {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={e => sf('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
        </select>
        <select className="filter-select" value={filters.status} onChange={e => sf('status', e.target.value)}>
          <option value="">All Statuses</option>
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {(filters.assignee || filters.priority || filters.status) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ assignee:'', priority:'', status:'' })}>
            Clear ✕
          </button>
        )}
      </div>

      {groups.map(grp => (
        <div key={grp.id} className="sprint-group">
          <div className={`sg-header${!collapsed[grp.id] ? ' open' : ''}`} onClick={() => toggle(grp.id)}>
            <span className={`sg-chevron${!collapsed[grp.id] ? ' open' : ''}`}>▶</span>
            <span className="sg-name">{grp.label}</span>
            <div className="sg-badges">
              {grp.status === 'active'    && <span className="active-sprint-label">Active Sprint</span>}
              {grp.status === 'completed' && (
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                  color:'#16a34a', background:'#dcfce7', padding:'2px 8px', borderRadius:10, border:'1px solid #bbf7d0' }}>
                  Completed
                </span>
              )}
              <span className="count-chip">{grp.tasks.length}</span>
              <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
                {grp.tasks.reduce((a,t) => a+(t.pts||0), 0)} pts
              </span>
            </div>
          </div>

          {!collapsed[grp.id] && (
            <>
              {grp.tasks.map(task => (
                <div key={task.id} className="story-row"
                  draggable onDragStart={() => { dragRef.current = { id:task.id }; }}
                  onClick={() => dispatch({ type:'OPEN_DRAWER', item:task, kind:'task' })}>
                  <span className="drag-handle">⠿</span>
                  <SDot status={task.status}/>
                  <span className="id-chip">{task.id}</span>
                  <span className="s-title">{task.title}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <PBadge id={task.priority}/>
                    <span className="pts-badge">{task.pts}</span>
                    {task.assigneeId && <Av id={task.assigneeId} size="xs" tip/>}
                    {task.sprintId
                      ? <span className="s-sprint-tag">{state.sprints.find(s => s.id === task.sprintId)?.name}</span>
                      : (
                        <select className="filter-select" style={{ fontSize:11, padding:'2px 20px 2px 7px' }}
                          value="" onClick={e => e.stopPropagation()}
                          onChange={e => { if (e.target.value) dispatch({ type:'MOVE_TO_SPRINT', id:task.id, sprintId:e.target.value }); }}>
                          <option value="">↗ Move to sprint</option>
                          {state.sprints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                        </select>
                      )
                    }
                  </div>
                </div>
              ))}

              {adding === grp.id ? (
                <div style={{ padding:'8px 16px', borderTop:'1px dashed var(--border)' }}>
                  <input autoFocus className="quick-input"
                    placeholder="Story title… (Enter to save, Esc to cancel)"
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter') addStory(grp.id); if(e.key==='Escape'){setAdding(null);} }}/>
                </div>
              ) : (
                <div className="add-story-row" onClick={() => setAdding(grp.id)}>
                  ＋ Add user story
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ISSUES
// ─────────────────────────────────────────────
function Issues({ state, dispatch }) {
  const [mode, setMode]       = useState('table');
  const [filters, setFilters] = useState({ type:'', priority:'', status:'', assignee:'' });
  const [sort, setSort]       = useState({ field:'created', dir:'desc' });
  const [showModal, setModal] = useState(false);
  const [newTitle, setNTitle] = useState('');
  const [newType, setNType]   = useState('bug');
  const dragRef = useRef(null);

  const sf = (k,v) => setFilters(f => ({ ...f, [k]:v }));

  const filtered = state.issues.filter(i => {
    if (filters.type     && i.type       !== filters.type)      return false;
    if (filters.priority && i.priority   !== filters.priority)  return false;
    if (filters.status   && i.status     !== filters.status)    return false;
    if (filters.assignee && i.assigneeId !== filters.assignee)  return false;
    return true;
  });

  const sorted = [...filtered].sort((a,b) => {
    const va = a[sort.field]||'', vb = b[sort.field]||'';
    return sort.dir==='asc' ? (va>vb?1:-1) : (va<vb?1:-1);
  });

  const sel = state.issues.filter(i => i.sel);

  const sortBy = field => setSort(s => ({ field, dir: s.field===field && s.dir==='asc' ? 'desc' : 'asc' }));
  const SortArrow = ({ f }) => sort.field !== f ? null : (
    <span style={{ color:'var(--accent)' }}>{sort.dir==='asc' ? ' ↑' : ' ↓'}</span>
  );

  const statusLabel = s => {
    if (s === 'reopened') return { label:'🔁 Reopened', color:'#ef4444' };
    const c = getCol(s);
    return { label: c.label, color: c.color };
  };

  return (
    <div className="issues-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">Issues</div>
          <div className="page-subtitle">Bugs, questions and enhancement requests</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div className="view-toggle-group">
            <button className={`vtg-btn${mode==='table'?' active':''}`} onClick={() => setMode('table')}>☰ Table</button>
            <button className={`vtg-btn${mode==='kanban'?' active':''}`} onClick={() => setMode('kanban')}>⬛ Board</button>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>＋ New Issue</button>
        </div>
      </div>

      <div className="filter-bar">
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Filter:</span>
        <select className="filter-select" value={filters.type} onChange={e => sf('type',e.target.value)}>
          <option value="">All Types</option>
          {ISSUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={e => sf('priority',e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
        </select>
        <select className="filter-select" value={filters.status} onChange={e => sf('status',e.target.value)}>
          <option value="">All Statuses</option>
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          <option value="reopened">🔁 Reopened</option>
        </select>
        <select className="filter-select" value={filters.assignee} onChange={e => sf('assignee',e.target.value)}>
          <option value="">All Assignees</option>
          {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {Object.values(filters).some(Boolean) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ type:'',priority:'',status:'',assignee:'' })}>
            Clear ✕
          </button>
        )}
      </div>

      {sel.length > 0 && (
        <div className="bulk-bar">
          <span>{sel.length} selected</span>
          <select className="filter-select" style={{ padding:'4px 24px 4px 8px' }}
            onChange={e => { if(e.target.value){ dispatch({ type:'BULK_ISSUES', op:'update', field:'status', val:e.target.value }); e.target.value=''; }}}>
            <option value="">Change status…</option>
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="filter-select" style={{ padding:'4px 24px 4px 8px' }}
            onChange={e => { if(e.target.value){ dispatch({ type:'BULK_ISSUES', op:'update', field:'assigneeId', val:e.target.value }); e.target.value=''; }}}>
            <option value="">Assign to…</option>
            {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="btn btn-danger btn-sm" onClick={() => dispatch({ type:'BULK_ISSUES', op:'delete' })}>
            🗑 Delete
          </button>
        </div>
      )}

      {mode === 'table' ? (
        <div className="issues-table-wrap">
          <table className="issues-table">
            <thead>
              <tr>
                <th style={{ width:36 }}><input type="checkbox" style={{ accentColor:'var(--accent)', cursor:'pointer' }}
                  onChange={() => state.issues.forEach(i => dispatch({ type:'TOGGLE_SEL', id:i.id }))}/></th>
                <th style={{ width:80 }}>#</th>
                <th style={{ width:50 }}>Type</th>
                <th onClick={() => sortBy('priority')}>Priority<SortArrow f="priority"/></th>
                <th onClick={() => sortBy('title')}>Title<SortArrow f="title"/></th>
                <th onClick={() => sortBy('status')}>Status<SortArrow f="status"/></th>
                <th>Assignee</th>
                <th onClick={() => sortBy('created')}>Created<SortArrow f="created"/></th>
                <th>Due</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(issue => {
                const sl = statusLabel(issue.status);
                const overdue = issue.due && new Date(issue.due) < new Date();
                return (
                  <tr key={issue.id}
                    className={issue.status === 'reopened' ? 'issue-reopened' : ''}
                    onClick={() => dispatch({ type:'OPEN_DRAWER', item:issue, kind:'issue' })}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" style={{ accentColor:'var(--accent)', cursor:'pointer' }}
                        checked={!!issue.sel} onChange={() => dispatch({ type:'TOGGLE_SEL', id:issue.id })}/>
                    </td>
                    <td><span className="id-chip">{issue.id}</span></td>
                    <td style={{ fontSize:16 }}>{getIType(issue.type).icon}</td>
                    <td><PBadge id={issue.priority} label/></td>
                    <td style={{ maxWidth:280, fontWeight:500 }}>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{issue.title}</div>
                    </td>
                    <td>
                      <span style={{ padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700,
                        background:`${sl.color}18`, color:sl.color }}>{sl.label}</span>
                    </td>
                    <td>
                      {issue.assigneeId
                        ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Av id={issue.assigneeId} size="xs"/>
                            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{getMbr(issue.assigneeId)?.name}</span>
                          </div>
                        : <span style={{ color:'var(--text-muted)', fontSize:12 }}>Unassigned</span>
                      }
                    </td>
                    <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text-muted)' }}>{issue.created}</td>
                    <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>{issue.due||'—'}</td>
                    <td><div style={{ display:'flex', gap:3 }}>{issue.tags.slice(0,2).map(t => <Tag key={t} t={t}/>)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Kanban view
        <div className="kanban-board" style={{ height:'calc(100vh - 310px)' }}>
          {COLUMNS.map(col => {
            const colIssues  = sorted.filter(i => i.status === col.id);
            const reopened   = col.id === 'new' ? sorted.filter(i => i.status === 'reopened') : [];
            const all = col.id === 'new' ? [...reopened, ...colIssues] : colIssues;
            return (
              <div key={col.id} className="k-col" style={{ width:210 }}>
                <div className="k-col-head">
                  <span className="k-col-dot" style={{ background:col.color }}/>
                  <span className="k-col-title" style={{ color:col.color }}>{col.label}</span>
                  <span className="count-chip">{all.length}</span>
                </div>
                <div className="k-cards">
                  {all.map(issue => {
                    const sl = statusLabel(issue.status);
                    return (
                      <div key={issue.id}
                        className="compact-issue-card"
                        style={issue.status==='reopened' ? { borderLeft:'3px solid #ef4444' } : {}}
                        onClick={() => dispatch({ type:'OPEN_DRAWER', item:issue, kind:'issue' })}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:13 }}>{getIType(issue.type).icon}</span>
                          <span className="id-chip">{issue.id}</span>
                          <PBadge id={issue.priority}/>
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{issue.title}</div>
                        {issue.assigneeId && <div style={{ marginTop:5 }}><Av id={issue.assigneeId} size="xs" tip/></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Issue</div>
            <div style={{ marginBottom:14 }}>
              <div className="d-label">Type</div>
              <div style={{ display:'flex', gap:8 }}>
                {ISSUE_TYPES.map(t => (
                  <button key={t.id}
                    className={`btn btn-sm${newType===t.id?' btn-primary':' btn-secondary'}`}
                    onClick={() => setNType(t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div className="d-label">Title</div>
              <input className="form-input" placeholder="Describe the issue…" autoFocus
                value={newTitle} onChange={e => setNTitle(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter' && newTitle.trim()){
                  dispatch({ type:'CREATE_ISSUE', title:newTitle.trim(), itype:newType });
                  setNTitle(''); setModal(false);
                }}}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { if(newTitle.trim()){ dispatch({ type:'CREATE_ISSUE', title:newTitle.trim(), itype:newType }); setNTitle(''); setModal(false); }}}>
                Create Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EPICS
// ─────────────────────────────────────────────
function Epics({ state, dispatch }) {
  const [modal, setModal] = useState(false);
  const [name, setName]   = useState('');

  return (
    <div className="epics-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">Epics</div>
          <div className="page-subtitle">High-level feature tracks and their progress</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>＋ New Epic</button>
      </div>

      {state.epics.map(epic => {
        const linked = state.tasks.filter(t => epic.stories.includes(t.id));
        return (
          <div key={epic.id} className="epic-card">
            <div className="epic-head" onClick={() => dispatch({ type:'TOGGLE_EPIC', id:epic.id })}>
              <div className="epic-stripe" style={{ background:epic.color, height:48 }}/>
              <div className="epic-info">
                <div className="epic-title">{epic.name}</div>
                <div className="epic-prog-wrap">
                  <div className="epic-prog-bg">
                    <div className="epic-prog-fill" style={{ width:`${epic.pct}%`, background:epic.color }}/>
                  </div>
                  <span className="epic-pct">{epic.pct}%</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{epic.stories.length} stories</span>
                </div>
              </div>
              <span className={`epic-chevron${epic.expanded?' open':''}`}>▶</span>
            </div>

            {epic.expanded && (
              <div className="epic-body">
                {linked.length === 0
                  ? <div style={{ padding:'20px', color:'var(--text-muted)', fontSize:13, textAlign:'center' }}>No linked stories.</div>
                  : linked.map(task => (
                    <div key={task.id} className="story-row"
                      onClick={() => dispatch({ type:'OPEN_DRAWER', item:task, kind:'task' })}>
                      <SDot status={task.status}/>
                      <span className="id-chip">{task.id}</span>
                      <span className="s-title">{task.title}</span>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                        <PBadge id={task.priority}/>
                        <span className="pts-badge">{task.pts}</span>
                        {task.assigneeId && <Av id={task.assigneeId} size="xs" tip/>}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        );
      })}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Epic</div>
            <div style={{ marginBottom:16 }}>
              <div className="d-label">Name</div>
              <input className="form-input" placeholder="Epic name…" autoFocus
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter' && name.trim()){
                  dispatch({ type:'CREATE_EPIC', name:name.trim() });
                  setName(''); setModal(false);
                }}}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { if(name.trim()){ dispatch({ type:'CREATE_EPIC', name:name.trim() }); setName(''); setModal(false); }}}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ state, dispatch }) {
  const sp2Tasks = state.tasks.filter(t => t.sprintId === 'sp2');
  const sprint   = state.sprints.find(s => s.id === 'sp2');
  const total    = sp2Tasks.length;
  const done     = sp2Tasks.filter(t => t.status === 'done').length;
  const inProg   = sp2Tasks.filter(t => t.status === 'in-progress').length;
  const openIss  = state.issues.filter(i => !['done','archived'].includes(i.status));
  const critBugs = state.issues.filter(i => i.priority === 'critical' && i.status !== 'done');
  const pts      = sp2Tasks.reduce((a,t) => a + (t.pts||0), 0);
  const donePts  = sp2Tasks.filter(t => t.status === 'done').reduce((a,t) => a + (t.pts||0), 0);

  const kpis = [
    { label:'Tasks In Progress', value: inProg,       color:'#6366f1', sub:`of ${total} total` },
    { label:'Done This Sprint',  value: done,         color:'#16a34a', sub:`${donePts} pts burned` },
    { label:'Open Issues',       value: openIss.length, color:'#f97316', sub:`${critBugs.length} critical` },
    { label:'Sprint Points',     value: pts,          color:'#0891b2', sub:`${donePts} burned` },
    { label:'Sprint Progress',   value:`${total?Math.round((done/total)*100):0}%`, color:'#a855f7', sub:`${done}/${total} stories done` },
    { label:'Team Members',      value: MEMBERS.length, color:'#ea580c', sub:'Active contributors' },
  ];

  const maxTasks = Math.max(...MEMBERS.map(m => state.tasks.filter(t => t.assigneeId === m.id).length));

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="page-title">👋 Welcome back, Alice</div>
        <div className="page-subtitle">
          {sprint?.name} is active · Goal: {sprint?.goal}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card" style={{ '--kpi-color': k.color }}>
            <div className="kpi-num">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sprint progress + recent tasks */}
      <div className="dash-grid3">
        {/* Sprint progress */}
        <div className="dash-card">
          <div className="dash-card-title">
            Sprint 2 Progress
            <button className="btn btn-ghost btn-xs" onClick={() => dispatch({ type:'VIEW', v:'sprint' })}>View Board →</button>
          </div>
          {(() => {
            const pct = total ? Math.round((done/total)*100) : 0;
            return (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                  <span>{done} done</span><span>{pct}%</span>
                </div>
                <div className="sprint-progress-bar">
                  <div className="sprint-progress-fill" style={{ width:`${pct}%` }}/>
                </div>
                <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:6 }}>
                  {COLUMNS.slice(0,5).map(col => {
                    const cnt = sp2Tasks.filter(t => t.status === col.id).length;
                    const p   = total ? (cnt/total)*100 : 0;
                    return (
                      <div key={col.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:col.color, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:'var(--text-secondary)', width:120, flexShrink:0 }}>{col.label}</span>
                        <div style={{ flex:1, height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', background:col.color, width:`${p}%`, borderRadius:2, transition:'width 600ms' }}/>
                        </div>
                        <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--text-muted)', width:20, textAlign:'right' }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Team workload */}
        <div className="dash-card">
          <div className="dash-card-title">Team Workload</div>
          {MEMBERS.map(m => {
            const cnt = state.tasks.filter(t => t.assigneeId === m.id && t.sprintId === 'sp2').length;
            const pct = maxTasks ? (cnt/maxTasks)*100 : 0;
            return (
              <div key={m.id} className="workload-row">
                <Av id={m.id} size="xs" tip/>
                <span style={{ fontSize:12, color:'var(--text-secondary)', width:70, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {m.name.split(' ')[0]}
                </span>
                <div className="workload-bar-bg">
                  <div className="workload-bar-fill" style={{ width:`${pct}%`, background:m.color }}/>
                </div>
                <span className="workload-count">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent tasks + Epics */}
      <div className="dash-grid2">
        <div className="dash-card">
          <div className="dash-card-title">
            Recent Tasks
            <button className="btn btn-ghost btn-xs" onClick={() => dispatch({ type:'VIEW', v:'backlog' })}>View All →</button>
          </div>
          {sp2Tasks.slice(0,5).map((t, i) => (
            <div key={t.id} className="activity-row"
              style={{ cursor:'pointer' }}
              onClick={() => dispatch({ type:'OPEN_DRAWER', item:t, kind:'task' })}>
              <span style={{ fontSize:14 }}>{getTType(t.type).icon}</span>
              <div className="activity-body">
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{t.title}</div>
                <div style={{ display:'flex', gap:8, marginTop:3 }}>
                  <PBadge id={t.priority}/>
                  <SDot status={t.status} size={7}/>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{getCol(t.status).label}</span>
                </div>
              </div>
              {t.assigneeId && <Av id={t.assigneeId} size="xs"/>}
            </div>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">
            Epic Progress
            <button className="btn btn-ghost btn-xs" onClick={() => dispatch({ type:'VIEW', v:'epics' })}>View All →</button>
          </div>
          {state.epics.map(epic => (
            <div key={epic.id} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:epic.color, display:'inline-block', flexShrink:0 }}/>
                  <span style={{ fontSize:13, fontWeight:600 }}>{epic.name}</span>
                </div>
                <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--text-secondary)' }}>{epic.pct}%</span>
              </div>
              <div style={{ background:'#f3f4f6', borderRadius:3, height:5, overflow:'hidden' }}>
                <div style={{ height:'100%', background:epic.color, width:`${epic.pct}%`, borderRadius:3, transition:'width 600ms' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TEAM
// ─────────────────────────────────────────────
function Team({ state }) {
  const roleColors = {
    'Frontend Dev': { bg:'#ede9fe', color:'#7c3aed' },
    'Backend Dev':  { bg:'#dbeafe', color:'#1d4ed8' },
    'QA Engineer':  { bg:'#fce7f3', color:'#be185d' },
    'DevOps':       { bg:'#ffedd5', color:'#c2410c' },
  };

  return (
    <div className="team-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">Team Members</div>
          <div className="page-subtitle">Your project collaborators</div>
        </div>
        <button className="btn btn-primary">＋ Invite Member</button>
      </div>
      <div className="team-grid">
        {MEMBERS.map(m => {
          const assigned  = state.tasks.filter(t => t.assigneeId === m.id).length;
          const inProg    = state.tasks.filter(t => t.assigneeId === m.id && t.status === 'in-progress').length;
          const rc = roleColors[m.role] || { bg:'#f3f4f6', color:'#374151' };
          return (
            <div key={m.id} className="team-card">
              <Av id={m.id} size="xl"/>
              <div style={{ marginTop:12, fontSize:16, fontWeight:700 }}>{m.name}</div>
              <span className="role-chip" style={{ background:rc.bg, color:rc.color }}>{m.role}</span>
              <div style={{ marginTop:14, display:'flex', justifyContent:'center', gap:24 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:'var(--accent)' }}>{assigned}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Assigned</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:'#0891b2' }}>{inProg}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>In Progress</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
function Settings() {
  const [projName, setProjName] = useState('InjeeScrum');
  const [sprintLen, setSpLen]   = useState('14');
  const [email, setEmail]       = useState(true);
  const [slack, setSlack]       = useState(false);

  const Toggle = ({ v, onChange }) => (
    <button onClick={onChange}
      style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
        background: v ? '#dcfce7' : '#f3f4f6', color: v ? '#15803d' : '#9ca3af', transition:'all 150ms' }}>
      {v ? '✓ On' : 'Off'}
    </button>
  );

  return (
    <div className="settings-view">
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Manage your project configuration</div>
      </div>
      <div className="settings-card">
        <h3>Project</h3>
        <div className="settings-row">
          <label>Project name</label>
          <input className="form-input" style={{ width:200 }} value={projName} onChange={e => setProjName(e.target.value)}/>
        </div>
        <div className="settings-row">
          <label>Default sprint length</label>
          <select className="form-select" style={{ width:120 }} value={sprintLen} onChange={e => setSpLen(e.target.value)}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="21">21 days</option>
          </select>
        </div>
      </div>
      <div className="settings-card">
        <h3>Notifications</h3>
        <div className="settings-row"><label>Email notifications</label><Toggle v={email} onChange={() => setEmail(v=>!v)}/></div>
        <div className="settings-row"><label>Slack notifications</label><Toggle v={slack} onChange={() => setSlack(v=>!v)}/></div>
      </div>
      <div className="settings-card">
        <h3>Appearance</h3>
        <div className="settings-row">
          <label>Theme</label>
          <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', background:'#ede9fe', color:'#7c3aed', borderRadius:20 }}>
            Dark Sidebar + Light Content (Active)
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAG ADDER (used in drawer)
// ─────────────────────────────────────────────
function TagAdder({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  if (!editing) return (
    <button className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>＋ Tag</button>
  );
  return (
    <input autoFocus className="st-input" style={{ width:88, padding:'3px 8px', fontSize:11 }}
      placeholder="tag…" value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key==='Enter' && val.trim()) { onAdd(val.trim()); setVal(''); setEditing(false); }
        if (e.key==='Escape') { setEditing(false); setVal(''); }
      }}
      onBlur={() => { setEditing(false); setVal(''); }}/>
  );
}

// ─────────────────────────────────────────────
// RIGHT DRAWER
// ─────────────────────────────────────────────
function Drawer({ state, dispatch }) {
  const { drawer } = state;
  const open = !!drawer;
  const [comment, setComment] = useState('');
  const [newSt, setNewSt]     = useState('');

  useEffect(() => { if (!open) { setComment(''); setNewSt(''); } }, [open]);

  if (!drawer) return (
    <>
      <div className={`drawer-backdrop${open?' open':''}`} onClick={() => dispatch({ type:'CLOSE_DRAWER' })}/>
      <div className={`drawer${open?' open':''}`}/>
    </>
  );

  const { item, kind } = drawer;
  const isTask = kind === 'task';
  const typeCfg = isTask ? getTType(item.type) : getIType(item.type);
  const colCfg  = item.status === 'reopened'
    ? { label:'🔁 Reopened', color:'#ef4444' }
    : getCol(item.status);

  const upd = ch => dispatch({ type: isTask ? 'UPDATE_TASK' : 'UPDATE_ISSUE', id: item.id, ch });

  const changeStatus = s => {
    if (isTask) dispatch({ type:'MOVE_TASK', id: item.id, to: s });
    else dispatch({ type:'UPDATE_ISSUE', id: item.id, ch: { status: s } });
  };

  const subtasks   = item.subtasks || [];
  const doneSt     = subtasks.filter(s => s.done).length;
  const activity   = item.activity || [];

  const allStatuses = [
    ...COLUMNS.map(c => ({ id:c.id, label:c.label, color:c.color })),
    ...(!isTask ? [{ id:'reopened', label:'🔁 Reopened', color:'#ef4444' }] : []),
  ];

  return (
    <>
      <div className={`drawer-backdrop${open?' open':''}`} onClick={() => dispatch({ type:'CLOSE_DRAWER' })}/>
      <div className={`drawer${open?' open':''}`}>

        {/* Header */}
        <div className="drawer-head">
          <span style={{ fontSize:18 }}>{typeCfg.icon}</span>
          <span className="id-chip">{item.id}</span>
          <select value={item.status} onChange={e => changeStatus(e.target.value)}
            style={{ flex:1, background:'transparent', border:`1px solid ${colCfg.color}60`,
              borderRadius:6, padding:'4px 8px', fontSize:12, fontWeight:700, color:colCfg.color,
              cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            {allStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost" style={{ padding:'4px 8px', fontSize:18 }}
            onClick={() => dispatch({ type:'CLOSE_DRAWER' })}>×</button>
        </div>

        {/* Body */}
        <div className="drawer-body">

          {/* Title */}
          <div className="drawer-sec">
            <textarea className="d-title-input" value={item.title} rows={2}
              onChange={e => upd({ title: e.target.value })}/>
          </div>

          {/* Description */}
          <div className="drawer-sec">
            <span className="d-label">Description</span>
            <textarea className="desc-area" placeholder="Add a description…"
              value={item.desc||''} onChange={e => upd({ desc: e.target.value })}/>
          </div>

          {/* Status */}
          <div className="drawer-sec">
            <span className="d-label">Status</span>
            <div className="status-pills">
              {allStatuses.map(s => (
                <button key={s.id} className="s-pill"
                  style={item.status===s.id
                    ? { background:`${s.color}18`, color:s.color, borderColor:s.color }
                    : {}}
                  onClick={() => changeStatus(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="drawer-sec">
            <span className="d-label">Priority</span>
            <div className="priority-pills">
              {PRIORITIES.map(p => (
                <button key={p.id} className={`pr-pill${item.priority===p.id?' active':''}`}
                  style={{ color:p.color, borderColor:p.color,
                    background: item.priority===p.id ? `${p.color}15` : 'transparent' }}
                  onClick={() => upd({ priority: p.id })}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="form-grid">
            <div className="form-field">
              <span className="d-label">Assignee</span>
              <select className="form-select" value={item.assigneeId||''}
                onChange={e => upd({ assigneeId: e.target.value||null })}>
                <option value="">Unassigned</option>
                {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {isTask && (
              <div className="form-field">
                <span className="d-label">Sprint</span>
                <select className="form-select" value={item.sprintId||''}
                  onChange={e => upd({ sprintId: e.target.value||null })}>
                  <option value="">No Sprint</option>
                  {state.sprints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
            )}
            {isTask && (
              <div className="form-field">
                <span className="d-label">Story Points</span>
                <div className="stepper">
                  <button className="st-btn" onClick={() => upd({ pts: Math.max(0,(item.pts||0)-1) })}>−</button>
                  <span className="st-val">{item.pts||0}</span>
                  <button className="st-btn" onClick={() => upd({ pts: (item.pts||0)+1 })}>+</button>
                </div>
              </div>
            )}
            <div className="form-field">
              <span className="d-label">Due Date</span>
              <input type="date" className="form-input" value={item.due||''}
                onChange={e => upd({ due: e.target.value })}/>
            </div>
          </div>

          {/* Tags */}
          <div className="drawer-sec">
            <span className="d-label">Tags</span>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
              {(item.tags||[]).map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <Tag t={t}/>
                  <button style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1, padding:'0 2px' }}
                    onClick={() => upd({ tags:(item.tags||[]).filter(x => x!==t) })}>×</button>
                </div>
              ))}
              <TagAdder onAdd={t => upd({ tags:[...(item.tags||[]), t] })}/>
            </div>
          </div>

          {/* Attachment drop zone */}
          <div className="drawer-sec">
            <span className="d-label">Attachments</span>
            <div className="drop-zone"><span style={{ fontSize:22 }}>📎</span><br/>Drop files here or click to upload</div>
          </div>

          <Divider/>

          {/* Subtasks (tasks only) */}
          {isTask && (
            <div className="drawer-sec">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span className="d-label" style={{ margin:0 }}>Subtasks</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
                  {doneSt}/{subtasks.length}
                </span>
              </div>
              {subtasks.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div className="pb-bg">
                    <div className="pb-fill" style={{ width:`${subtasks.length?(doneSt/subtasks.length)*100:0}%`, background:'var(--accent)' }}/>
                  </div>
                </div>
              )}
              <div>
                {subtasks.map(st => (
                  <div key={st.id} className="subtask-item">
                    <input type="checkbox" className="st-cb" checked={st.done}
                      onChange={() => dispatch({ type:'TOGGLE_SUBTASK', taskId:item.id, stId:st.id })}/>
                    <span className={`st-text${st.done?' st-done':''}`}>{st.title}</span>
                  </div>
                ))}
              </div>
              <div className="st-add-row">
                <input className="st-input" placeholder="Add subtask…" value={newSt}
                  onChange={e => setNewSt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key==='Enter' && newSt.trim()) {
                      dispatch({ type:'ADD_SUBTASK', taskId:item.id, title:newSt.trim() });
                      setNewSt('');
                    }
                  }}/>
                <button className="btn btn-primary btn-sm"
                  onClick={() => { if(newSt.trim()){ dispatch({ type:'ADD_SUBTASK', taskId:item.id, title:newSt.trim() }); setNewSt(''); }}}>
                  Add
                </button>
              </div>
            </div>
          )}

          <Divider/>

          {/* Activity */}
          <div className="drawer-sec">
            <span className="d-label">Activity</span>
            {activity.slice(0,6).map(a => (
              <div key={a.id} className="activity-row">
                <Av id="alice" size="xs"/>
                <div className="activity-body">
                  <div className="activity-text">
                    {a.type==='comment'
                      ? <><b>{a.user}</b>: {a.text}</>
                      : <><b>{a.user}</b> {a.text}</>
                    }
                  </div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
            <div className="comment-wrap">
              <Av id="alice" size="sm"/>
              <div style={{ flex:1 }}>
                <textarea className="c-area" placeholder="Write a comment…"
                  value={comment} onChange={e => setComment(e.target.value)}/>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
                  <button className="btn btn-primary btn-sm" disabled={!comment.trim()}
                    onClick={() => { dispatch({ type:'ADD_COMMENT', id:item.id, text:comment.trim() }); setComment(''); }}>
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ state, dispatch }) {
  const c = state.sidebarCollapsed;
  const activeSprint = state.sprints.find(s => s.status === 'active');

  const nav = [
    { id:'dashboard', icon:'🏠', label:'Dashboard' },
    { id:'backlog',   icon:'📋', label:'Backlog' },
    { id:'sprint',    icon:'🏃', label:'Sprint Board', badge: activeSprint ? 'LIVE' : null },
    { id:'issues',    icon:'🐛', label:'Issues' },
    { id:'epics',     icon:'📊', label:'Epics' },
    { id:'team',      icon:'👥', label:'Team' },
    { id:'settings',  icon:'⚙️', label:'Settings' },
  ];

  return (
    <aside className={`sidebar${c?' collapsed':' expanded'}`}>
      <div className="sb-logo">
        <div className="sb-logo-icon">🚀</div>
        <div className="sb-logo-text">
          <strong>InjeeScrum</strong>
          <span>Project Manager</span>
        </div>
      </div>

      <button className="sb-toggle" onClick={() => dispatch({ type:'SIDEBAR' })}>
        {c ? '›' : '‹'}
      </button>

      <nav className="sb-nav">
        <div className="sb-section-label">Navigation</div>
        {nav.map(n => (
          <div key={n.id}
            className={`nav-item${state.view === n.id ? ' active' : ''}`}
            onClick={() => dispatch({ type:'VIEW', v: n.id })}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            {n.badge && <span className="nav-badge">{n.badge}</span>}
          </div>
        ))}
      </nav>

      <div className="sb-bottom">
        <div className="sb-user">
          <Av id="alice" size="sm"/>
          <div className="sb-user-info">
            <strong>Alice Chen</strong>
            <span>Product Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// TOP NAV
// ─────────────────────────────────────────────
function TopNav({ state, dispatch }) {
  const [ddOpen, setDdOpen] = useState(false);
  const ref = useRef(null);
  const labels = {
    dashboard:'Dashboard', backlog:'Backlog', sprint:'Sprint Board',
    issues:'Issues', epics:'Epics', team:'Team', settings:'Settings',
  };

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="top-nav">
      <div className="breadcrumb">
        <span className="breadcrumb-project">InjeeScrum</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-page">{labels[state.view] || state.view}</span>
      </div>

      <div className="top-search">
        <span className="top-search-icon">🔍</span>
        <input placeholder="Search tasks, issues, epics…"
          value={state.search}
          onChange={e => dispatch({ type:'SEARCH', q: e.target.value })}/>
      </div>

      <div className="top-right">
        <button className="nav-icon-btn" title="Filters">⚙</button>
        <button className="nav-icon-btn" title="Notifications">
          🔔
          {state.notifs > 0 && <span className="notif-dot">{state.notifs}</span>}
        </button>

        <div style={{ position:'relative' }} ref={ref}>
          <div className="user-pill" onClick={() => setDdOpen(v => !v)}>
            <Av id="alice" size="sm"/>
            <span className="user-pill-name">Alice</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>▼</span>
          </div>
          {ddOpen && (
            <div className="user-dropdown">
              <div className="dropdown-item">👤 Profile</div>
              <div className="dropdown-item" onClick={() => { dispatch({ type:'VIEW', v:'settings' }); setDdOpen(false); }}>⚙️ Settings</div>
              <div className="dropdown-divider"/>
              <div className="dropdown-item danger">🚪 Logout</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, init);

  const views = {
    dashboard: <Dashboard state={state} dispatch={dispatch}/>,
    backlog:   <Backlog   state={state} dispatch={dispatch}/>,
    sprint:    <SprintBoard state={state} dispatch={dispatch}/>,
    issues:    <Issues    state={state} dispatch={dispatch}/>,
    epics:     <Epics     state={state} dispatch={dispatch}/>,
    team:      <Team      state={state}/>,
    settings:  <Settings/>,
  };

  return (
    <div className="app-layout">
      <Sidebar state={state} dispatch={dispatch}/>

      <div className="main-area">
        <TopNav state={state} dispatch={dispatch}/>
        <div className="content-area">
          <div key={state.view} className="page-in">
            {views[state.view] || views.dashboard}
          </div>
        </div>
      </div>

      <Drawer state={state} dispatch={dispatch}/>
    </div>
  );
}
