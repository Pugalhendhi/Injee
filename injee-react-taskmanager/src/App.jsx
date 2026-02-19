import React, { useState, useReducer, useRef, useEffect, useCallback } from 'react';
import {
  tasksAPI, issuesAPI, sprintsAPI, epicsAPI,
  loadAllData, initDatabase,
  completeSprint as apiCompleteSprint,
  reopenIssue as apiReopenIssue,
  recalcEpicProgress,
} from './api/scrumClient';

// ─────────────────────────────────────────────
// CONSTANTS (display only, no data)
// ─────────────────────────────────────────────
const COLUMNS = [
  { id:'new',          label:'To Do',             color:'#9ca3af' },
  { id:'in-progress',  label:'In Progress',       color:'#6366f1' },
  { id:'ready-test',   label:'Ready for Test',    color:'#f97316' },
  { id:'ready-deploy', label:'Ready to Deploy',   color:'#a855f7' },
  { id:'done',         label:'Done',              color:'#16a34a' },
  { id:'archived',     label:'Archived',          color:'#9ca3af' },
];
const PRIORITIES = [
  { id:'critical', label:'Critical', icon:'🔴', color:'#ef4444' },
  { id:'high',     label:'High',     icon:'🟠', color:'#f97316' },
  { id:'normal',   label:'Normal',   icon:'🔵', color:'#6366f1' },
  { id:'low',      label:'Low',      icon:'🟢', color:'#22c55e' },
  { id:'wishlist', label:'Wishlist', icon:'⚪', color:'#a855f7' },
];
const TASK_TYPES  = [
  { id:'story', label:'Story', icon:'📖' },
  { id:'task',  label:'Task',  icon:'✅' },
  { id:'bug',   label:'Bug',   icon:'🐛' },
];
const ISSUE_TYPES = [
  { id:'bug',         label:'Bug',         icon:'🐛' },
  { id:'question',    label:'Question',    icon:'❓' },
  { id:'enhancement', label:'Enhancement', icon:'✨' },
];
const MEMBERS = [
  { id:'alice', name:'Alice Chen',   role:'Frontend Dev', color:'#6366f1' },
  { id:'bob',   name:'Bob Martinez', role:'Backend Dev',  color:'#0891b2' },
  { id:'carol', name:'Carol Smith',  role:'QA Engineer',  color:'#a855f7' },
  { id:'dave',  name:'Dave Johnson', role:'DevOps',       color:'#ea580c' },
];
const TAG_PAL = [
  { bg:'#ede9fe', color:'#7c3aed' }, { bg:'#dbeafe', color:'#1d4ed8' },
  { bg:'#dcfce7', color:'#15803d' }, { bg:'#ffedd5', color:'#c2410c' },
  { bg:'#fce7f3', color:'#be185d' }, { bg:'#e0f2fe', color:'#0369a1' },
];

// ─── helpers ──────────────────────────────────
const getCol   = id => COLUMNS.find(c => c.id === id)     || COLUMNS[0];
const getPri   = id => PRIORITIES.find(p => p.id === id)  || PRIORITIES[2];
const getMbr   = id => MEMBERS.find(m => m.id === id);
const getTType = id => TASK_TYPES.find(t => t.id === id)  || TASK_TYPES[1];
const getIType = id => ISSUE_TYPES.find(t => t.id === id) || ISSUE_TYPES[0];
const tagClr   = t  => TAG_PAL[Math.abs(t.split('').reduce((a,c) => a+c.charCodeAt(0),0)) % TAG_PAL.length];
let _n = 900;
const tmpId = () => `tmp-${++_n}`;

// ─────────────────────────────────────────────
// UI REDUCER  (view / sidebar / drawer — no data)
// ─────────────────────────────────────────────
const initUI = {
  sidebarCollapsed: false,
  view: 'dashboard',
  activeSprint: null,   // set after data loads
  drawer: null,         // { item, kind }
  search: '',
  notifs: 4,
};

function uiReducer(s, a) {
  switch (a.type) {
    case 'SIDEBAR':       return { ...s, sidebarCollapsed: !s.sidebarCollapsed };
    case 'VIEW':          return { ...s, view: a.v };
    case 'SPRINT':        return { ...s, activeSprint: a.id };
    case 'SEARCH':        return { ...s, search: a.q };
    case 'OPEN_DRAWER':   return { ...s, drawer: { item: a.item, kind: a.kind } };
    case 'CLOSE_DRAWER':  return { ...s, drawer: null };
    case 'UPDATE_DRAWER': return s.drawer
      ? { ...s, drawer: { ...s.drawer, item: { ...s.drawer.item, ...a.ch } } }
      : s;
    default: return s;
  }
}

// ─────────────────────────────────────────────
// REUSABLE UI COMPONENTS
// ─────────────────────────────────────────────
function Av({ id, size = 'md', tip = false }) {
  const m = getMbr(id);
  const el = (
    <div className={`av av-${size}`} style={{ background: m?.color || '#9ca3af' }}>
      {m ? m.name[0] : '?'}
    </div>
  );
  if (!tip || !m) return el;
  return <div className="tip">{el}<div className="tip-box">{m.name}</div></div>;
}

function PBadge({ id, label = false }) {
  const p = getPri(id);
  return <span className="p-badge" style={{ background:`${p.color}18`, color:p.color }}>{p.icon}{label && ` ${p.label}`}</span>;
}

function SDot({ status, size = 9 }) {
  const c = status === 'reopened' ? '#ef4444' : getCol(status).color;
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:c, flexShrink:0 }} />;
}

function Tag({ t }) {
  const tc = tagClr(t);
  return <span className="tag" style={{ background:tc.bg, color:tc.color }}>{t}</span>;
}

function Divider() { return <div className="divider" />; }

// Loading skeleton card
function SkeletonCard() {
  return (
    <div style={{ background:'#fff', border:'1px solid #e4e6ef', borderRadius:10, padding:12 }}>
      {[80,60,40].map((w,i) => (
        <div key={i} style={{ height:12, background:'#f0f2f7', borderRadius:6, marginBottom:8, width:`${w}%`,
          animation:'pulse 1.4s ease infinite', animationDelay:`${i*0.15}s` }}/>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// TOAST  (error / success notifications)
// ─────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex', alignItems:'center', gap:10,
          background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: t.type === 'error' ? '#dc2626' : '#15803d',
          padding:'10px 16px', borderRadius:10,
          boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
          fontSize:13, fontWeight:500, minWidth:280, maxWidth:380,
          animation:'slideInRight 200ms ease',
        }}>
          <span>{t.type === 'error' ? '⚠️' : '✓'}</span>
          <span style={{ flex:1 }}>{t.msg}</span>
          <button onClick={() => removeToast(t.id)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:16, padding:'0 2px', opacity:.6 }}>×</button>
        </div>
      ))}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'error') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);
  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, toast: add, removeToast: remove };
}

// ─────────────────────────────────────────────
// BURNDOWN CHART
// ─────────────────────────────────────────────
function Burndown({ sprint }) {
  const total = sprint?.pts || 45;
  const W = 600, H = 72, days = 14;
  const ideal  = Array.from({ length:days+1 }, (_,i) => total - (total/days)*i);
  const actual = [45,43,41,40,37,33,30,26,24,22,18,14,10,7,4];
  const x = i => (i/days)*W;
  const y = v => H - (v/total)*(H-6) - 2;
  const path = pts => pts.map((v,i) => `${i?'L':'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg className="burndown-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0,.25,.5,.75,1].map(f => <line key={f} x1={0} y1={y(f*total)} x2={W} y2={y(f*total)} stroke="#e5e7eb" strokeWidth=".6"/>)}
      <path d={path(ideal)} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 4"/>
      <path d={`${path(actual)} L${x(days)},${H} L0,${H} Z`} fill="rgba(99,102,241,0.08)"/>
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
  const type    = getTType(task.type);
  const done    = task.subtasks?.filter(s => s.done).length || 0;
  const total   = task.subtasks?.length || 0;
  const pct     = total ? (done/total)*100 : 0;
  const overdue = task.due && new Date(task.due) < new Date();
  const accentC = getCol(task.status).color;

  return (
    <div
      className={`task-card${dragging ? ' dragging' : ''}`}
      style={{ '--card-accent': accentC }}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed='move'; dragRef.current={id:task.id,from:task.status}; setDragging(true); }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(task, 'task')}
    >
      <div className="hover-actions" onClick={e => e.stopPropagation()}>
        <button className="ha-btn" onClick={() => onOpen(task,'task')}>✏️</button>
        <button className="ha-btn del" onClick={() => { e?.stopPropagation?.(); onDelete(task.id); }}>🗑</button>
      </div>
      <div className="tc-top">
        <div className="tc-meta">
          <span className="tc-type-icon">{type.icon}</span>
          <span className="id-chip">{task.id}</span>
        </div>
        <div className="pts-badge">{task.pts}</div>
      </div>
      <div className="tc-title">{task.title}</div>
      {task.tags?.length > 0 && <div className="tc-tags">{task.tags.slice(0,3).map(t => <Tag key={t} t={t}/>)}</div>}
      <div className="tc-foot">
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <PBadge id={task.priority}/>
          {task.assigneeId && <Av id={task.assigneeId} size="xs" tip/>}
        </div>
        {task.due && <span className={`due-label${overdue?' overdue':''}`}>{overdue?'⚠ ':''}{task.due}</span>}
      </div>
      {total > 0 && (
        <div className="progress-bar">
          <div className="pb-bg"><div className="pb-fill" style={{ width:`${pct}%`, background:accentC }}/></div>
          <div className="pb-text">{done}/{total} subtasks</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KANBAN COLUMN
// ─────────────────────────────────────────────
function KanbanCol({ col, tasks, actions, dragRef, onOpen, saving }) {
  const [over, setOver]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle]   = useState('');

  const drop = e => {
    e.preventDefault(); setOver(false);
    const { id, from } = dragRef.current || {};
    if (id && from !== col.id) actions.moveTask(id, col.id, from);
    dragRef.current = null;
  };

  const confirm = () => {
    if (title.trim()) actions.createTask({ type:'task', title:title.trim(), status:col.id });
    setAdding(false); setTitle('');
  };

  return (
    <div className={`k-col${over?' drag-over':''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}>
      <div className="k-col-head">
        <span className="k-col-dot" style={{ background:col.color }}/>
        <span className="k-col-title" style={{ color:col.color }}>{col.label}</span>
        <span className="count-chip">{tasks.length}</span>
      </div>
      <div className="k-cards">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onOpen={onOpen}
            onDelete={id => actions.deleteTask(id)} dragRef={dragRef}/>
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
function SprintBoard({ tasks, sprints, ui, uiDispatch, actions, saving }) {
  const [showBurn, setShowBurn] = useState(false);
  const dragRef = useRef(null);

  const sprint  = sprints.find(s => s.id === ui.activeSprint) || sprints.find(s => s.status === 'active') || sprints[0];
  const stTasks = tasks.filter(t => t.sprintId === sprint?.id);
  const done    = stTasks.filter(t => t.status === 'done').length;
  const pts     = stTasks.reduce((a,t) => a+(t.pts||0), 0);
  const burned  = stTasks.filter(t => t.status==='done').reduce((a,t) => a+(t.pts||0), 0);

  if (!sprint) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ textAlign:'center', color:'var(--text-secondary)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
        <div style={{ fontSize:16, fontWeight:600 }}>No sprints yet</div>
        <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => actions.createSprint()}>＋ Create First Sprint</button>
      </div>
    </div>
  );

  return (
    <div className="sprint-view">
      <div className="sprint-toolbar">
        <div className="sprint-title-row">
          <div>
            <div className="sprint-name">{sprint.name}
              {sprint.status === 'active' && (
                <span style={{ marginLeft:10, fontSize:11, fontWeight:700, padding:'2px 9px', background:'#dcfce7', color:'#15803d', borderRadius:10, border:'1px solid #bbf7d0', verticalAlign:'middle' }}>ACTIVE</span>
              )}
            </div>
            <div className="sprint-dates">{sprint.start} → {sprint.end}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => actions.createSprint()}>＋ New Sprint</button>
            {sprint.status === 'active' && (
              <button className="btn btn-teal btn-sm" disabled={saving.has(sprint.id)}
                onClick={() => actions.completeSprint(sprint.id)}>
                {saving.has(sprint.id) ? 'Completing…' : '✓ Complete Sprint'}
              </button>
            )}
          </div>
        </div>

        <div className="sprint-meta-row">
          <span className="sprint-stat"><b>{stTasks.length}</b> stories</span>
          <span className="sprint-stat"><b style={{color:'#16a34a'}}>{done}</b> done</span>
          <span className="sprint-stat"><b style={{color:'#6366f1'}}>{pts}</b> points</span>
          <span className="sprint-stat"><b style={{color:'#0891b2'}}>{burned}</b> burned</span>
          <span className="sprint-stat"><b style={{color:'#a855f7'}}>{pts>0?Math.round((burned/pts)*100):0}%</b> velocity</span>
        </div>

        <div className="sprint-tabs">
          {sprints.map(sp => (
            <button key={sp.id}
              className={`sprint-tab${sp.id === sprint.id ? ' active' : ''}`}
              onClick={() => uiDispatch({ type:'SPRINT', id:sp.id })}>
              {sp.name} {sp.status==='active'?'🟢':sp.status==='completed'?'✓':'📋'}
            </button>
          ))}
        </div>
      </div>

      <div className="burndown-section">
        <button className="burndown-toggle" onClick={() => setShowBurn(v => !v)}>
          {showBurn?'▼':'▶'} Burndown Chart
        </button>
        {showBurn && <div className="burndown-body"><Burndown sprint={sprint}/></div>}
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => (
          <KanbanCol key={col.id} col={col}
            tasks={stTasks.filter(t => t.status === col.id)}
            actions={{ ...actions, createTask: (d) => actions.createTask({ ...d, sprintId: sprint.id }) }}
            dragRef={dragRef} onOpen={(item,kind) => uiDispatch({ type:'OPEN_DRAWER', item, kind })}
            saving={saving}/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BACKLOG
// ─────────────────────────────────────────────
function Backlog({ tasks, sprints, ui, uiDispatch, actions }) {
  const [collapsed, setCollapsed] = useState({});
  const [filters, setFilters]     = useState({ assignee:'', priority:'', status:'' });
  const [adding, setAdding]       = useState(null);
  const [newTitle, setNewTitle]   = useState('');
  const dragRef = useRef(null);

  const sf = (k,v) => setFilters(f => ({ ...f, [k]:v }));

  const filtered = tasks.filter(t =>
    (!filters.assignee || t.assigneeId === filters.assignee) &&
    (!filters.priority || t.priority   === filters.priority) &&
    (!filters.status   || t.status     === filters.status)
  );

  const groups = [
    ...sprints.map(sp => ({ id:sp.id, label:sp.name, status:sp.status, tasks:filtered.filter(t => t.sprintId===sp.id) })),
    { id:'backlog', label:'Unassigned / Backlog', status:'none', tasks:filtered.filter(t => !t.sprintId) },
  ];

  const toggle = id => setCollapsed(c => ({ ...c, [id]:!c[id] }));

  const addStory = grpId => {
    if (newTitle.trim()) {
      actions.createTask({ type:'story', title:newTitle.trim(), sprintId: grpId==='backlog'?null:grpId, status:'new' });
    }
    setAdding(null); setNewTitle('');
  };

  return (
    <div className="backlog-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">Product Backlog</div>
          <div className="page-subtitle">All stories, tasks and bugs across sprints</div>
        </div>
        <button className="btn btn-primary"
          onClick={() => actions.createTask({ type:'story', title:'New User Story', sprintId:null, status:'new' })}>
          ＋ New Story
        </button>
      </div>

      <div className="filter-bar">
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Filter:</span>
        {[
          ['assignee', 'All Assignees', MEMBERS.map(m => [m.id, m.name])],
          ['priority',  'All Priorities', PRIORITIES.map(p => [p.id, `${p.icon} ${p.label}`])],
          ['status',    'All Statuses',   COLUMNS.map(c => [c.id, c.label])],
        ].map(([k, ph, opts]) => (
          <select key={k} className="filter-select" value={filters[k]} onChange={e => sf(k, e.target.value)}>
            <option value="">{ph}</option>
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ assignee:'',priority:'',status:'' })}>Clear ✕</button>
        )}
      </div>

      {groups.map(grp => (
        <div key={grp.id} className="sprint-group">
          <div className={`sg-header${!collapsed[grp.id]?' open':''}`} onClick={() => toggle(grp.id)}>
            <span className={`sg-chevron${!collapsed[grp.id]?' open':''}`}>▶</span>
            <span className="sg-name">{grp.label}</span>
            <div className="sg-badges">
              {grp.status==='active'    && <span className="active-sprint-label">Active Sprint</span>}
              {grp.status==='completed' && <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#16a34a', background:'#dcfce7', padding:'2px 8px', borderRadius:10 }}>Completed</span>}
              <span className="count-chip">{grp.tasks.length}</span>
              <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
                {grp.tasks.reduce((a,t) => a+(t.pts||0),0)} pts
              </span>
            </div>
          </div>

          {!collapsed[grp.id] && (
            <>
              {grp.tasks.map(task => (
                <div key={task.id} className="story-row"
                  draggable onDragStart={() => { dragRef.current={id:task.id}; }}
                  onClick={() => uiDispatch({ type:'OPEN_DRAWER', item:task, kind:'task' })}>
                  <span className="drag-handle">⠿</span>
                  <SDot status={task.status}/>
                  <span className="id-chip">{task.id}</span>
                  <span className="s-title">{task.title}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <PBadge id={task.priority}/>
                    <span className="pts-badge">{task.pts}</span>
                    {task.assigneeId && <Av id={task.assigneeId} size="xs" tip/>}
                    {task.sprintId
                      ? <span className="s-sprint-tag">{sprints.find(s => s.id===task.sprintId)?.name}</span>
                      : <select className="filter-select" style={{ fontSize:11, padding:'2px 20px 2px 7px' }}
                          value="" onClick={e => e.stopPropagation()}
                          onChange={e => { if(e.target.value) actions.moveToSprint(task.id, e.target.value); }}>
                          <option value="">↗ Move to sprint</option>
                          {sprints.filter(s => s.status!=='completed').map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                        </select>
                    }
                  </div>
                </div>
              ))}

              {adding === grp.id ? (
                <div style={{ padding:'8px 16px', borderTop:'1px dashed var(--border)' }}>
                  <input autoFocus className="quick-input" placeholder="Story title… (Enter to save, Esc to cancel)"
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter') addStory(grp.id); if(e.key==='Escape') setAdding(null); }}/>
                </div>
              ) : (
                <div className="add-story-row" onClick={() => setAdding(grp.id)}>＋ Add user story</div>
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
function Issues({ issues, ui, uiDispatch, actions }) {
  const [mode, setMode]       = useState('table');
  const [filters, setFilters] = useState({ type:'', priority:'', status:'', assignee:'' });
  const [sort, setSort]       = useState({ field:'created', dir:'desc' });
  const [modal, setModal]     = useState(false);
  const [newTitle, setNTitle] = useState('');
  const [newType, setNType]   = useState('bug');

  const sf = (k,v) => setFilters(f => ({ ...f,[k]:v }));
  const sel = issues.filter(i => i.sel);

  const filtered = issues.filter(i =>
    (!filters.type     || i.type       === filters.type)     &&
    (!filters.priority || i.priority   === filters.priority) &&
    (!filters.status   || i.status     === filters.status)   &&
    (!filters.assignee || i.assigneeId === filters.assignee)
  );

  const sorted = [...filtered].sort((a,b) => {
    const va=a[sort.field]||'', vb=b[sort.field]||'';
    return sort.dir==='asc' ? (va>vb?1:-1) : (va<vb?1:-1);
  });

  const sortBy = f => setSort(s => ({ field:f, dir:s.field===f&&s.dir==='asc'?'desc':'asc' }));
  const Arr = ({ f }) => sort.field!==f ? null : <span style={{ color:'var(--accent)' }}>{sort.dir==='asc'?' ↑':' ↓'}</span>;

  const slabel = s => s==='reopened' ? { label:'🔁 Reopened', color:'#ef4444' } : { label:getCol(s).label, color:getCol(s).color };

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
        {[
          ['type',     'All Types',     ISSUE_TYPES.map(t => [t.id, `${t.icon} ${t.label}`])],
          ['priority', 'All Priorities', PRIORITIES.map(p => [p.id, `${p.icon} ${p.label}`])],
          ['status',   'All Statuses',   [...COLUMNS.map(c => [c.id,c.label]), ['reopened','🔁 Reopened']]],
          ['assignee', 'All Assignees',  MEMBERS.map(m => [m.id, m.name])],
        ].map(([k,ph,opts]) => (
          <select key={k} className="filter-select" value={filters[k]} onChange={e => sf(k, e.target.value)}>
            <option value="">{ph}</option>
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ type:'',priority:'',status:'',assignee:'' })}>Clear ✕</button>
        )}
      </div>

      {sel.length > 0 && (
        <div className="bulk-bar">
          <span>{sel.length} selected</span>
          <select className="filter-select" style={{ padding:'4px 24px 4px 8px' }}
            onChange={e => { if(e.target.value){ actions.bulkIssues('status', e.target.value); e.target.value=''; }}}>
            <option value="">Change status…</option>
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="filter-select" style={{ padding:'4px 24px 4px 8px' }}
            onChange={e => { if(e.target.value){ actions.bulkIssues('assigneeId', e.target.value); e.target.value=''; }}}>
            <option value="">Assign to…</option>
            {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="btn btn-danger btn-sm" onClick={() => actions.bulkIssues('delete')}>🗑 Delete</button>
        </div>
      )}

      {mode === 'table' ? (
        <div className="issues-table-wrap">
          <table className="issues-table">
            <thead>
              <tr>
                <th style={{ width:36 }}><input type="checkbox" style={{ accentColor:'var(--accent)', cursor:'pointer' }}
                  onChange={() => issues.forEach(i => actions.toggleIssueSelect(i.id))}/></th>
                <th>#</th><th>Type</th>
                <th onClick={() => sortBy('priority')}>Priority<Arr f="priority"/></th>
                <th onClick={() => sortBy('title')}>Title<Arr f="title"/></th>
                <th onClick={() => sortBy('status')}>Status<Arr f="status"/></th>
                <th>Assignee</th>
                <th onClick={() => sortBy('created')}>Created<Arr f="created"/></th>
                <th>Due</th><th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(issue => {
                const sl = slabel(issue.status);
                const overdue = issue.due && new Date(issue.due) < new Date();
                return (
                  <tr key={issue.id}
                    className={issue.status==='reopened'?'issue-reopened':''}
                    onClick={() => uiDispatch({ type:'OPEN_DRAWER', item:issue, kind:'issue' })}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" style={{ accentColor:'var(--accent)', cursor:'pointer' }}
                        checked={!!issue.sel} onChange={() => actions.toggleIssueSelect(issue.id)}/>
                    </td>
                    <td><span className="id-chip">{issue.id}</span></td>
                    <td style={{ fontSize:16 }}>{getIType(issue.type).icon}</td>
                    <td><PBadge id={issue.priority} label/></td>
                    <td style={{ maxWidth:280, fontWeight:500 }}>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{issue.title}</div>
                    </td>
                    <td>
                      <span style={{ padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700, background:`${sl.color}18`, color:sl.color }}>{sl.label}</span>
                    </td>
                    <td>
                      {issue.assigneeId
                        ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Av id={issue.assigneeId} size="xs"/>
                            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{getMbr(issue.assigneeId)?.name}</span>
                          </div>
                        : <span style={{ color:'var(--text-muted)', fontSize:12 }}>Unassigned</span>}
                    </td>
                    <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text-muted)' }}>{issue.created}</td>
                    <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:overdue?'var(--red)':'var(--text-muted)' }}>{issue.due||'—'}</td>
                    <td><div style={{ display:'flex', gap:3 }}>{issue.tags?.slice(0,2).map(t => <Tag key={t} t={t}/>)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kanban-board" style={{ height:'calc(100vh - 310px)' }}>
          {COLUMNS.map(col => {
            const colIs = sorted.filter(i => i.status===col.id);
            const reopened = col.id==='new' ? sorted.filter(i => i.status==='reopened') : [];
            const all = col.id==='new' ? [...reopened, ...colIs] : colIs;
            return (
              <div key={col.id} className="k-col" style={{ width:210 }}>
                <div className="k-col-head">
                  <span className="k-col-dot" style={{ background:col.color }}/>
                  <span className="k-col-title" style={{ color:col.color }}>{col.label}</span>
                  <span className="count-chip">{all.length}</span>
                </div>
                <div className="k-cards">
                  {all.map(issue => (
                    <div key={issue.id} className="compact-issue-card"
                      style={issue.status==='reopened'?{borderLeft:'3px solid #ef4444'}:{}}
                      onClick={() => uiDispatch({ type:'OPEN_DRAWER', item:issue, kind:'issue' })}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13 }}>{getIType(issue.type).icon}</span>
                        <span className="id-chip">{issue.id}</span>
                        <PBadge id={issue.priority}/>
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{issue.title}</div>
                      {issue.assigneeId && <div style={{ marginTop:5 }}><Av id={issue.assigneeId} size="xs" tip/></div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Issue</div>
            <div style={{ marginBottom:14 }}>
              <div className="d-label">Type</div>
              <div style={{ display:'flex', gap:8 }}>
                {ISSUE_TYPES.map(t => (
                  <button key={t.id} className={`btn btn-sm${newType===t.id?' btn-primary':' btn-secondary'}`}
                    onClick={() => setNType(t.id)}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div className="d-label">Title</div>
              <input className="form-input" placeholder="Describe the issue…" autoFocus
                value={newTitle} onChange={e => setNTitle(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&newTitle.trim()){
                  actions.createIssue({ type:newType, title:newTitle.trim() });
                  setNTitle(''); setModal(false);
                }}}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { if(newTitle.trim()){ actions.createIssue({ type:newType, title:newTitle.trim() }); setNTitle(''); setModal(false); }}}>
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
function Epics({ epics, tasks, ui, uiDispatch, actions }) {
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

      {epics.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:16, fontWeight:600 }}>No epics yet</div>
          <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setModal(true)}>Create your first epic</button>
        </div>
      ) : epics.map(epic => {
        const linked = tasks.filter(t => (epic.stories||[]).includes(t.id));
        return (
          <div key={epic.id} className="epic-card">
            <div className="epic-head" onClick={() => actions.toggleEpic(epic.id)}>
              <div className="epic-stripe" style={{ background:epic.color, height:48 }}/>
              <div className="epic-info">
                <div className="epic-title">{epic.name}</div>
                <div className="epic-prog-wrap">
                  <div className="epic-prog-bg"><div className="epic-prog-fill" style={{ width:`${epic.pct}%`, background:epic.color }}/></div>
                  <span className="epic-pct">{epic.pct}%</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{(epic.stories||[]).length} stories</span>
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
                      onClick={() => uiDispatch({ type:'OPEN_DRAWER', item:task, kind:'task' })}>
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
                onKeyDown={e => { if(e.key==='Enter'&&name.trim()){ actions.createEpic(name.trim()); setName(''); setModal(false); }}}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => { if(name.trim()){ actions.createEpic(name.trim()); setName(''); setModal(false); }}}>
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
function Dashboard({ tasks, issues, sprints, epics, ui, uiDispatch }) {
  const activeSprint = sprints.find(s => s.status==='active');
  const spTasks  = tasks.filter(t => t.sprintId === activeSprint?.id);
  const total    = spTasks.length;
  const done     = spTasks.filter(t => t.status==='done').length;
  const inProg   = spTasks.filter(t => t.status==='in-progress').length;
  const openIss  = issues.filter(i => !['done','archived'].includes(i.status));
  const critBugs = issues.filter(i => i.priority==='critical' && i.status!=='done');
  const pts      = spTasks.reduce((a,t) => a+(t.pts||0), 0);
  const donePts  = spTasks.filter(t => t.status==='done').reduce((a,t) => a+(t.pts||0), 0);
  const maxWork  = Math.max(1, ...MEMBERS.map(m => spTasks.filter(t => t.assigneeId===m.id).length));

  const kpis = [
    { label:'In Progress',    value:inProg,         color:'#6366f1', sub:`of ${total} stories` },
    { label:'Done This Sprint',value:done,           color:'#16a34a', sub:`${donePts} pts burned` },
    { label:'Open Issues',    value:openIss.length, color:'#f97316', sub:`${critBugs.length} critical` },
    { label:'Sprint Points',  value:pts,            color:'#0891b2', sub:`${donePts} burned` },
    { label:'Progress',       value:`${total?Math.round((done/total)*100):0}%`, color:'#a855f7', sub:`${done}/${total} done` },
    { label:'Team Members',   value:MEMBERS.length, color:'#ea580c', sub:'Active contributors' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="page-title">👋 Welcome back, Alice</div>
        <div className="page-subtitle">
          {activeSprint ? `${activeSprint.name} — ${activeSprint.goal}` : 'No active sprint'}
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card" style={{ '--kpi-color':k.color }}>
            <div className="kpi-num">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid3">
        <div className="dash-card">
          <div className="dash-card-title">
            Sprint Progress
            <button className="btn btn-ghost btn-xs" onClick={() => uiDispatch({ type:'VIEW', v:'sprint' })}>View Board →</button>
          </div>
          {activeSprint ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                <span>{done} done</span><span>{total?Math.round((done/total)*100):0}%</span>
              </div>
              <div className="sprint-progress-bar">
                <div className="sprint-progress-fill" style={{ width:`${total?Math.round((done/total)*100):0}%` }}/>
              </div>
              <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:6 }}>
                {COLUMNS.slice(0,5).map(col => {
                  const cnt = spTasks.filter(t => t.status===col.id).length;
                  return (
                    <div key={col.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:col.color, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'var(--text-secondary)', width:120, flexShrink:0 }}>{col.label}</span>
                      <div style={{ flex:1, height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:col.color, width:`${total?(cnt/total)*100:0}%`, borderRadius:2, transition:'width 600ms' }}/>
                      </div>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--text-muted)', width:20, textAlign:'right' }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <div style={{ color:'var(--text-muted)', fontSize:13 }}>Start a sprint to see progress.</div>}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Team Workload</div>
          {MEMBERS.map(m => {
            const cnt = spTasks.filter(t => t.assigneeId===m.id).length;
            return (
              <div key={m.id} className="workload-row">
                <Av id={m.id} size="xs" tip/>
                <span style={{ fontSize:12, color:'var(--text-secondary)', width:70, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {m.name.split(' ')[0]}
                </span>
                <div className="workload-bar-bg">
                  <div className="workload-bar-fill" style={{ width:`${(cnt/maxWork)*100}%`, background:m.color }}/>
                </div>
                <span className="workload-count">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-grid2">
        <div className="dash-card">
          <div className="dash-card-title">
            Recent Tasks
            <button className="btn btn-ghost btn-xs" onClick={() => uiDispatch({ type:'VIEW', v:'backlog' })}>View All →</button>
          </div>
          {spTasks.slice(0,5).map(t => (
            <div key={t.id} className="activity-row" style={{ cursor:'pointer' }}
              onClick={() => uiDispatch({ type:'OPEN_DRAWER', item:t, kind:'task' })}>
              <span style={{ fontSize:14 }}>{getTType(t.type).icon}</span>
              <div className="activity-body">
                <div style={{ fontSize:13, fontWeight:500 }}>{t.title}</div>
                <div style={{ display:'flex', gap:8, marginTop:3 }}>
                  <PBadge id={t.priority}/><SDot status={t.status} size={7}/>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{getCol(t.status).label}</span>
                </div>
              </div>
              {t.assigneeId && <Av id={t.assigneeId} size="xs"/>}
            </div>
          ))}
          {spTasks.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13 }}>No tasks in active sprint.</div>}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">
            Epic Progress
            <button className="btn btn-ghost btn-xs" onClick={() => uiDispatch({ type:'VIEW', v:'epics' })}>View All →</button>
          </div>
          {epics.map(epic => (
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
function Team({ tasks }) {
  const roleColors = {
    'Frontend Dev':{ bg:'#ede9fe', color:'#7c3aed' }, 'Backend Dev':{ bg:'#dbeafe', color:'#1d4ed8' },
    'QA Engineer': { bg:'#fce7f3', color:'#be185d' }, 'DevOps':     { bg:'#ffedd5', color:'#c2410c' },
  };
  return (
    <div className="team-view">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><div className="page-title">Team Members</div><div className="page-subtitle">Your project collaborators</div></div>
        <button className="btn btn-primary">＋ Invite Member</button>
      </div>
      <div className="team-grid">
        {MEMBERS.map(m => {
          const assigned = tasks.filter(t => t.assigneeId===m.id).length;
          const inProg   = tasks.filter(t => t.assigneeId===m.id && t.status==='in-progress').length;
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
  const [pn, setPn] = useState('InjeeScrum');
  const [sl, setSl] = useState('14');
  const [em, setEm] = useState(true);
  const [sk, setSk] = useState(false);
  const Tog = ({ v, cb }) => (
    <button onClick={cb} style={{ padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
      background: v ? '#dcfce7' : '#f3f4f6', color: v ? '#15803d' : '#9ca3af', transition:'all 150ms' }}>
      {v ? '✓ On' : 'Off'}
    </button>
  );
  return (
    <div className="settings-view">
      <div className="page-header"><div className="page-title">Settings</div><div className="page-subtitle">Project configuration</div></div>
      <div className="settings-card">
        <h3>Project</h3>
        <div className="settings-row"><label>Project name</label><input className="form-input" style={{ width:200 }} value={pn} onChange={e => setPn(e.target.value)}/></div>
        <div className="settings-row"><label>Default sprint length</label>
          <select className="form-select" style={{ width:120 }} value={sl} onChange={e => setSl(e.target.value)}>
            {['7','14','21'].map(v => <option key={v} value={v}>{v} days</option>)}
          </select>
        </div>
      </div>
      <div className="settings-card">
        <h3>Notifications</h3>
        <div className="settings-row"><label>Email</label><Tog v={em} cb={() => setEm(v=>!v)}/></div>
        <div className="settings-row"><label>Slack</label><Tog v={sk} cb={() => setSk(v=>!v)}/></div>
      </div>
      <div className="settings-card">
        <h3>Backend</h3>
        <div className="settings-row"><label>Injee URL</label><span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text-secondary)' }}>http://localhost:4125</span></div>
        <div className="settings-row"><label>Collections</label><span style={{ fontSize:12, color:'var(--text-secondary)' }}>tasks · issues · sprints · epics</span></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAG ADDER
// ─────────────────────────────────────────────
function TagAdder({ onAdd }) {
  const [on, setOn] = useState(false);
  const [v, setV]   = useState('');
  if (!on) return <button className="btn btn-ghost btn-xs" onClick={() => setOn(true)}>＋ Tag</button>;
  return (
    <input autoFocus className="st-input" style={{ width:88, padding:'3px 8px', fontSize:11 }} placeholder="tag…"
      value={v} onChange={e => setV(e.target.value)}
      onKeyDown={e => { if(e.key==='Enter'&&v.trim()){ onAdd(v.trim()); setV(''); setOn(false); } if(e.key==='Escape'){setOn(false);setV('');} }}
      onBlur={() => { setOn(false); setV(''); }}/>
  );
}

// ─────────────────────────────────────────────
// RIGHT DRAWER
// ─────────────────────────────────────────────
function Drawer({ ui, uiDispatch, tasks, issues, sprints, actions }) {
  const { drawer } = ui;
  const open = !!drawer;
  const [comment, setComment] = useState('');
  const [newSt, setNewSt]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => { if(!open){ setComment(''); setNewSt(''); } }, [open]);

  if (!drawer) return (
    <>
      <div className={`drawer-backdrop${open?' open':''}`} onClick={() => uiDispatch({ type:'CLOSE_DRAWER' })}/>
      <div className={`drawer${open?' open':''}`}/>
    </>
  );

  const { item, kind } = drawer;
  const isTask  = kind === 'task';
  const typeCfg = isTask ? getTType(item.type) : getIType(item.type);
  const colCfg  = item.status === 'reopened' ? { label:'🔁 Reopened', color:'#ef4444' } : getCol(item.status);

  // Update drawer UI immediately, persist to API
  const upd = ch => {
    uiDispatch({ type:'UPDATE_DRAWER', ch });
    if (isTask) actions.updateTask(item.id, ch);
    else        actions.updateIssue(item.id, ch);
  };

  const changeStatus = s => {
    if (isTask) actions.moveTask(item.id, s, item.status);
    else        actions.updateIssue(item.id, { status:s });
    uiDispatch({ type:'UPDATE_DRAWER', ch:{ status:s } });
  };

  const allStatuses = [
    ...COLUMNS.map(c => ({ id:c.id, label:c.label, color:c.color })),
    ...(!isTask ? [{ id:'reopened', label:'🔁 Reopened', color:'#ef4444' }] : []),
  ];

  const subtasks = item.subtasks || [];
  const doneSt   = subtasks.filter(s => s.done).length;

  const addSubtask = () => {
    if (!newSt.trim() || !isTask) return;
    const st = { id:`st-${Date.now()}`, title:newSt.trim(), done:false };
    const updated = [...subtasks, st];
    uiDispatch({ type:'UPDATE_DRAWER', ch:{ subtasks:updated } });
    actions.updateTask(item.id, { subtasks:updated });
    setNewSt('');
  };

  const toggleSubtask = stId => {
    const updated = subtasks.map(st => st.id===stId ? { ...st, done:!st.done } : st);
    uiDispatch({ type:'UPDATE_DRAWER', ch:{ subtasks:updated } });
    actions.updateTask(item.id, { subtasks:updated });
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const entry = { id:`act-${Date.now()}`, type:'comment', text:comment.trim(), user:'You', time:'just now' };
    const updated = [entry, ...(item.activity||[])];
    uiDispatch({ type:'UPDATE_DRAWER', ch:{ activity:updated } });
    actions.addComment(item.id, isTask?'task':'issue', comment.trim());
    setComment('');
  };

  return (
    <>
      <div className={`drawer-backdrop${open?' open':''}`} onClick={() => uiDispatch({ type:'CLOSE_DRAWER' })}/>
      <div className={`drawer${open?' open':''}`}>
        {/* Header */}
        <div className="drawer-head">
          <span style={{ fontSize:18 }}>{typeCfg.icon}</span>
          <span className="id-chip">{item.id}</span>
          <select value={item.status} onChange={e => changeStatus(e.target.value)}
            style={{ flex:1, background:'transparent', border:`1px solid ${colCfg.color}60`, borderRadius:6,
              padding:'4px 8px', fontSize:12, fontWeight:700, color:colCfg.color, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            {allStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost" style={{ padding:'4px 8px', fontSize:18 }}
            onClick={() => uiDispatch({ type:'CLOSE_DRAWER' })}>×</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Title */}
          <div className="drawer-sec">
            <textarea className="d-title-input" value={item.title} rows={2}
              onChange={e => upd({ title:e.target.value })}/>
          </div>

          {/* Description */}
          <div className="drawer-sec">
            <span className="d-label">Description</span>
            <textarea className="desc-area" placeholder="Add a description…"
              value={item.desc||''} onChange={e => upd({ desc:e.target.value })}/>
          </div>

          {/* Status pills */}
          <div className="drawer-sec">
            <span className="d-label">Status</span>
            <div className="status-pills">
              {allStatuses.map(s => (
                <button key={s.id} className="s-pill"
                  style={item.status===s.id ? { background:`${s.color}18`, color:s.color, borderColor:s.color } : {}}
                  onClick={() => changeStatus(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Priority pills */}
          <div className="drawer-sec">
            <span className="d-label">Priority</span>
            <div className="priority-pills">
              {PRIORITIES.map(p => (
                <button key={p.id} className={`pr-pill${item.priority===p.id?' active':''}`}
                  style={{ color:p.color, borderColor:p.color, background:item.priority===p.id?`${p.color}15`:'transparent' }}
                  onClick={() => upd({ priority:p.id })}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="form-grid">
            <div className="form-field">
              <span className="d-label">Assignee</span>
              <select className="form-select" value={item.assigneeId||''}
                onChange={e => upd({ assigneeId:e.target.value||null })}>
                <option value="">Unassigned</option>
                {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {isTask && (
              <div className="form-field">
                <span className="d-label">Sprint</span>
                <select className="form-select" value={item.sprintId||''}
                  onChange={e => upd({ sprintId:e.target.value||null })}>
                  <option value="">No Sprint</option>
                  {sprints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
            )}
            {isTask && (
              <div className="form-field">
                <span className="d-label">Story Points</span>
                <div className="stepper">
                  <button className="st-btn" onClick={() => upd({ pts:Math.max(0,(item.pts||0)-1) })}>−</button>
                  <span className="st-val">{item.pts||0}</span>
                  <button className="st-btn" onClick={() => upd({ pts:(item.pts||0)+1 })}>+</button>
                </div>
              </div>
            )}
            <div className="form-field">
              <span className="d-label">Due Date</span>
              <input type="date" className="form-input" value={item.due||''}
                onChange={e => upd({ due:e.target.value })}/>
            </div>
          </div>

          {/* Tags */}
          <div className="drawer-sec">
            <span className="d-label">Tags</span>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
              {(item.tags||[]).map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <Tag t={t}/>
                  <button style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1 }}
                    onClick={() => upd({ tags:(item.tags||[]).filter(x=>x!==t) })}>×</button>
                </div>
              ))}
              <TagAdder onAdd={t => upd({ tags:[...(item.tags||[]),t] })}/>
            </div>
          </div>

          {/* Attachment zone */}
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
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>{doneSt}/{subtasks.length}</span>
              </div>
              {subtasks.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div className="pb-bg">
                    <div className="pb-fill" style={{ width:`${subtasks.length?(doneSt/subtasks.length)*100:0}%`, background:'var(--accent)' }}/>
                  </div>
                </div>
              )}
              {subtasks.map(st => (
                <div key={st.id} className="subtask-item">
                  <input type="checkbox" className="st-cb" checked={st.done} onChange={() => toggleSubtask(st.id)}/>
                  <span className={`st-text${st.done?' st-done':''}`}>{st.title}</span>
                </div>
              ))}
              <div className="st-add-row">
                <input className="st-input" placeholder="Add subtask…" value={newSt}
                  onChange={e => setNewSt(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') addSubtask(); }}/>
                <button className="btn btn-primary btn-sm" onClick={addSubtask}>Add</button>
              </div>
            </div>
          )}

          <Divider/>

          {/* Activity & Comments */}
          <div className="drawer-sec">
            <span className="d-label">Activity</span>
            {(item.activity||[]).slice(0,6).map(a => (
              <div key={a.id} className="activity-row">
                <Av id="alice" size="xs"/>
                <div className="activity-body">
                  <div className="activity-text">
                    {a.type==='comment' ? <><b>{a.user}</b>: {a.text}</> : <><b>{a.user}</b> {a.text}</>}
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
                  <button className="btn btn-primary btn-sm" disabled={!comment.trim()} onClick={addComment}>Comment</button>
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
function Sidebar({ ui, uiDispatch, sprints }) {
  const c = ui.sidebarCollapsed;
  const activeSprint = sprints.find(s => s.status === 'active');
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
        <div className="sb-logo-text"><strong>InjeeScrum</strong><span>Project Manager</span></div>
      </div>
      <button className="sb-toggle" onClick={() => uiDispatch({ type:'SIDEBAR' })}>{c?'›':'‹'}</button>
      <nav className="sb-nav">
        <div className="sb-section-label">Navigation</div>
        {nav.map(n => (
          <div key={n.id} className={`nav-item${ui.view===n.id?' active':''}`}
            onClick={() => uiDispatch({ type:'VIEW', v:n.id })}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            {n.badge && <span className="nav-badge">{n.badge}</span>}
          </div>
        ))}
      </nav>
      <div className="sb-bottom">
        <div className="sb-user">
          <Av id="alice" size="sm"/>
          <div className="sb-user-info"><strong>Alice Chen</strong><span>Product Owner</span></div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// TOP NAV
// ─────────────────────────────────────────────
function TopNav({ ui, uiDispatch, saving }) {
  const [ddOpen, setDdOpen] = useState(false);
  const ref = useRef(null);
  const labels = { dashboard:'Dashboard', backlog:'Backlog', sprint:'Sprint Board', issues:'Issues', epics:'Epics', team:'Team', settings:'Settings' };

  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="top-nav">
      <div className="breadcrumb">
        <span className="breadcrumb-project">InjeeScrum</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-page">{labels[ui.view] || ui.view}</span>
      </div>

      <div className="top-search">
        <span className="top-search-icon">🔍</span>
        <input placeholder="Search tasks, issues, epics…"
          value={ui.search} onChange={e => uiDispatch({ type:'SEARCH', q:e.target.value })}/>
      </div>

      <div className="top-right">
        {saving.size > 0 && (
          <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ animation:'spin .8s linear infinite', display:'inline-block' }}>⟳</span> Saving…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </span>
        )}
        <button className="nav-icon-btn" title="Filters">⚙</button>
        <button className="nav-icon-btn">
          🔔{ui.notifs>0 && <span className="notif-dot">{ui.notifs}</span>}
        </button>
        <div style={{ position:'relative' }} ref={ref}>
          <div className="user-pill" onClick={() => setDdOpen(v=>!v)}>
            <Av id="alice" size="sm"/>
            <span className="user-pill-name">Alice</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>▼</span>
          </div>
          {ddOpen && (
            <div className="user-dropdown">
              <div className="dropdown-item">👤 Profile</div>
              <div className="dropdown-item" onClick={() => { uiDispatch({ type:'VIEW', v:'settings' }); setDdOpen(false); }}>⚙️ Settings</div>
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
// LOADING SCREEN
// ─────────────────────────────────────────────
function LoadingScreen({ seeding }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', gap:16 }}>
      <div style={{ fontSize:48 }}>🚀</div>
      <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>InjeeScrum</div>
      <div style={{ fontSize:14, color:'var(--text-secondary)' }}>
        {seeding ? 'Setting up your database with sample data…' : 'Connecting to Injee backend…'}
      </div>
      <div style={{ width:200, height:4, background:'var(--border)', borderRadius:2, overflow:'hidden', marginTop:8 }}>
        <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, animation:'loading 1.5s ease infinite' }}/>
      </div>
      <style>{`@keyframes loading{0%{width:0;transform:translateX(0)}50%{width:60%}100%{width:0;transform:translateX(200px)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT — wires API to state
// ─────────────────────────────────────────────
export default function App() {
  // ── Data state (from Injee) ────────────────
  const [tasks,   setTasks]   = useState([]);
  const [issues,  setIssues]  = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics,   setEpics]   = useState([]);

  // ── Loading / error ────────────────────────
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving,  setSaving]  = useState(new Set()); // set of IDs currently being saved

  // ── UI state (view / sidebar / drawer) ─────
  const [ui, uiDispatch] = useReducer(uiReducer, initUI);

  // ── Toast ──────────────────────────────────
  const { toasts, toast, removeToast } = useToast();

  // ─── Track saving IDs ──────────────────────
  const startSave = id => setSaving(s => { const n=new Set(s); n.add(id); return n; });
  const endSave   = id => setSaving(s => { const n=new Set(s); n.delete(id); return n; });

  // ─── Initial load ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setSeeding(false);
        const wasEmpty = await initDatabase();
        if (wasEmpty) setSeeding(true);

        const data = await loadAllData();
        setTasks(data.tasks);
        setIssues(data.issues);
        setSprints(data.sprints);
        setEpics(data.epics);

        // Set active sprint
        const active = data.sprints.find(s => s.status === 'active');
        if (active) uiDispatch({ type:'SPRINT', id: active.id });

      } catch (err) {
        console.error('[App] Failed to load data:', err);
        toast('Could not connect to Injee. Make sure it is running on http://localhost:4125', 'error');
      } finally {
        setLoading(false);
        setSeeding(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── TASK ACTIONS ──────────────────────────
  const actions = {

    // Move task between columns (drag-drop + status change)
    moveTask: async (id, toStatus, fromStatus) => {
      // Optimistic
      setTasks(ts => ts.map(t => t.id===id ? { ...t, status:toStatus } : t));
      startSave(id);
      try {
        const updated = await tasksAPI.update(id, { status:toStatus });
        setTasks(ts => ts.map(t => t.id===id ? updated : t));
        // Recalculate epic progress
        setEpics(async eps => {
          const fresh = await Promise.all(
            eps.map(e => (e.stories||[]).includes(id) ? recalcEpicProgress(e, tasks) : e)
          );
          return fresh;
        });
      } catch {
        setTasks(ts => ts.map(t => t.id===id ? { ...t, status:fromStatus } : t)); // rollback
        toast('Failed to move task. Check Injee connection.', 'error');
      } finally { endSave(id); }
    },

    // Create task
    createTask: async (data) => {
      const tempId = tmpId();
      const tempTask = { id:tempId, type:data.type||'task', title:data.title, desc:'', status:data.status||'new',
        priority:'normal', sprintId:data.sprintId||ui.activeSprint||null, assigneeId:null, pts:1, tags:[], due:null,
        subtasks:[], activity:[], created:new Date().toISOString().slice(0,10) };
      setTasks(ts => [...ts, tempTask]); // optimistic
      startSave(tempId);
      try {
        const created = await tasksAPI.create({ ...data, sprintId:data.sprintId||ui.activeSprint||null });
        setTasks(ts => ts.map(t => t.id===tempId ? created : t));
        toast(`Task "${created.title}" created`, 'success');
      } catch {
        setTasks(ts => ts.filter(t => t.id!==tempId)); // rollback
        toast('Failed to create task.', 'error');
      } finally { endSave(tempId); }
    },

    // Update any task fields (debounce handled at call site via drawer)
    updateTask: async (id, ch) => {
      setTasks(ts => ts.map(t => t.id===id ? { ...t, ...ch } : t)); // optimistic
      startSave(id);
      try {
        const updated = await tasksAPI.update(id, ch);
        setTasks(ts => ts.map(t => t.id===id ? updated : t));
      } catch {
        toast('Failed to save task update.', 'error');
      } finally { endSave(id); }
    },

    // Delete task
    deleteTask: async (id) => {
      const backup = tasks.find(t => t.id===id);
      setTasks(ts => ts.filter(t => t.id!==id)); // optimistic
      try {
        await tasksAPI.delete(id);
        if (ui.drawer?.item?.id === id) uiDispatch({ type:'CLOSE_DRAWER' });
        toast('Task deleted', 'success');
      } catch {
        if (backup) setTasks(ts => [...ts, backup]); // rollback
        toast('Failed to delete task.', 'error');
      }
    },

    // Move task to sprint
    moveToSprint: async (id, sprintId) => {
      setTasks(ts => ts.map(t => t.id===id ? { ...t, sprintId, status:'new' } : t));
      startSave(id);
      try {
        await tasksAPI.update(id, { sprintId, status:'new' });
        toast('Task moved to sprint', 'success');
      } catch {
        toast('Failed to move task to sprint.', 'error');
      } finally { endSave(id); }
    },

    // Complete sprint: mark sprint done, archive remaining tasks
    completeSprint: async (sprintId) => {
      startSave(sprintId);
      try {
        const archivedIds = await apiCompleteSprint(sprintId, tasks);
        setSprints(ss => ss.map(s => s.id===sprintId ? { ...s, status:'completed' } : s));
        setTasks(ts => ts.map(t => archivedIds.includes(t.id) ? { ...t, status:'archived' } : t));
        toast('Sprint completed! Remaining tasks archived.', 'success');
      } catch {
        toast('Failed to complete sprint.', 'error');
      } finally { endSave(sprintId); }
    },

    // Create new sprint
    createSprint: async () => {
      const newSp = {
        name: `Sprint ${sprints.length + 1}`,
        start: new Date().toISOString().slice(0,10),
        end: new Date(Date.now()+14*86400000).toISOString().slice(0,10),
        status: 'planning', goal: '', pts: 0,
      };
      try {
        const created = await sprintsAPI.create(newSp);
        setSprints(ss => [...ss, created]);
        uiDispatch({ type:'SPRINT', id: created.id });
        toast(`${created.name} created`, 'success');
      } catch {
        toast('Failed to create sprint.', 'error');
      }
    },

    // ── ISSUE ACTIONS ─────────────────────────
    createIssue: async (data) => {
      const tempId = tmpId();
      const tempIssue = { id:tempId, type:data.type||'bug', title:data.title, desc:'', status:'new',
        priority:'normal', assigneeId:null, tags:[], due:null, activity:[], created:new Date().toISOString().slice(0,10), sel:false };
      setIssues(is => [tempIssue, ...is]);
      startSave(tempId);
      try {
        const created = await issuesAPI.create(data);
        setIssues(is => is.map(i => i.id===tempId ? created : i));
        toast(`Issue "${created.title}" created`, 'success');
      } catch {
        setIssues(is => is.filter(i => i.id!==tempId));
        toast('Failed to create issue.', 'error');
      } finally { endSave(tempId); }
    },

    updateIssue: async (id, ch) => {
      setIssues(is => is.map(i => i.id===id ? { ...i, ...ch } : i));
      startSave(id);
      try {
        const updated = await issuesAPI.update(id, ch);
        setIssues(is => is.map(i => i.id===id ? { ...updated, sel:false } : i));
      } catch {
        toast('Failed to save issue update.', 'error');
      } finally { endSave(id); }
    },

    deleteIssue: async (id) => {
      setIssues(is => is.filter(i => i.id!==id));
      try { await issuesAPI.delete(id); }
      catch { toast('Failed to delete issue.', 'error'); }
    },

    toggleIssueSelect: id => setIssues(is => is.map(i => i.id===id ? { ...i, sel:!i.sel } : i)),

    bulkIssues: async (field, val) => {
      const selIds = issues.filter(i => i.sel).map(i => i.id);
      if (field === 'delete') {
        setIssues(is => is.filter(i => !i.sel));
        try { await Promise.all(selIds.map(id => issuesAPI.delete(id))); toast('Issues deleted', 'success'); }
        catch { toast('Some deletions failed.', 'error'); }
      } else {
        setIssues(is => is.map(i => i.sel ? { ...i, [field]:val, sel:false } : i));
        try {
          await Promise.all(selIds.map(id => issuesAPI.update(id, { [field]:val })));
          toast('Issues updated', 'success');
        } catch { toast('Some updates failed.', 'error'); }
      }
    },

    // ── EPIC ACTIONS ──────────────────────────
    createEpic: async (name) => {
      const cols = ['#6366f1','#0891b2','#a855f7','#ea580c','#16a34a','#ef4444'];
      try {
        const created = await epicsAPI.create({ name, color:cols[epics.length % cols.length], pct:0, desc:'', stories:[] });
        setEpics(es => [...es, created]);
        toast(`Epic "${name}" created`, 'success');
      } catch { toast('Failed to create epic.', 'error'); }
    },

    toggleEpic: id => setEpics(es => es.map(e => e.id===id ? { ...e, expanded:!e.expanded } : e)),

    // ── COMMENT ───────────────────────────────
    addComment: async (id, kind, text) => {
      const entry = { id:`act-${Date.now()}`, type:'comment', text, user:'You', time:'just now' };
      if (kind === 'task') {
        const task = tasks.find(t => t.id===id);
        if (task) await tasksAPI.update(id, { activity:[entry, ...(task.activity||[])] });
      } else {
        const issue = issues.find(i => i.id===id);
        if (issue) await issuesAPI.update(id, { activity:[entry, ...(issue.activity||[])] });
      }
    },
  };

  // ─── Loading screen ────────────────────────
  if (loading) return <LoadingScreen seeding={seeding}/>;

  // ─── Filter tasks/issues by search query ───
  const q = ui.search.toLowerCase().trim();
  const visibleTasks  = q ? tasks.filter(t  => t.title.toLowerCase().includes(q)  || t.id.toLowerCase().includes(q))  : tasks;
  const visibleIssues = q ? issues.filter(i => i.title.toLowerCase().includes(q)  || i.id.toLowerCase().includes(q))  : issues;

  // ─── Render view ───────────────────────────
  const views = {
    dashboard: <Dashboard tasks={visibleTasks} issues={visibleIssues} sprints={sprints} epics={epics} ui={ui} uiDispatch={uiDispatch}/>,
    backlog:   <Backlog   tasks={visibleTasks} sprints={sprints} ui={ui} uiDispatch={uiDispatch} actions={actions}/>,
    sprint:    <SprintBoard tasks={visibleTasks} sprints={sprints} ui={ui} uiDispatch={uiDispatch} actions={actions} saving={saving}/>,
    issues:    <Issues    issues={visibleIssues} ui={ui} uiDispatch={uiDispatch} actions={actions}/>,
    epics:     <Epics     epics={epics} tasks={visibleTasks} ui={ui} uiDispatch={uiDispatch} actions={actions}/>,
    team:      <Team      tasks={visibleTasks}/>,
    settings:  <Settings/>,
  };

  return (
    <div className="app-layout">
      <Sidebar ui={ui} uiDispatch={uiDispatch} sprints={sprints}/>

      <div className="main-area">
        <TopNav ui={ui} uiDispatch={uiDispatch} saving={saving}/>
        <div className="content-area">
          <div key={ui.view} className="page-in">
            {views[ui.view] || views.dashboard}
          </div>
        </div>
      </div>

      <Drawer ui={ui} uiDispatch={uiDispatch}
        tasks={tasks} issues={issues} sprints={sprints}
        actions={actions}/>

      <Toast toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}
