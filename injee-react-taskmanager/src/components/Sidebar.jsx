import './Sidebar.css';

function Sidebar({ 
  activeFilter, 
  onFilterChange, 
  activePriority, 
  onPriorityChange,
  taskCounts = { all: 0, active: 0, completed: 0 }
}) {
  const filters = [
    { id: 'all', label: 'All Tasks', icon: 'list', count: taskCounts.all },
    { id: 'active', label: 'Active', icon: 'circle', count: taskCounts.active },
    { id: 'completed', label: 'Completed', icon: 'check-circle', count: taskCounts.completed },
  ];

  const priorities = [
    { id: 'high', label: 'High Priority', color: 'red' },
    { id: 'medium', label: 'Medium Priority', color: 'amber' },
    { id: 'low', label: 'Low Priority', color: 'green' },
  ];

  const renderIcon = (icon) => {
    switch (icon) {
      case 'list':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case 'circle':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case 'check-circle':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Task filters">
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Tasks</h3>
        <ul className="sidebar-nav">
          {filters.map((filter) => (
            <li key={filter.id}>
              <button
                className={`sidebar-link ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => onFilterChange(filter.id)}
                aria-current={activeFilter === filter.id ? 'page' : undefined}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {renderIcon(filter.icon)}
                </span>
                <span className="sidebar-label">{filter.label}</span>
                {filter.count > 0 && (
                  <span className="sidebar-badge" aria-label={`${filter.count} tasks`}>
                    {filter.count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-heading">Priority</h3>
        <ul className="sidebar-nav">
          {priorities.map((priority) => (
            <li key={priority.id}>
              <button
                className={`sidebar-link ${activePriority === priority.id ? 'active' : ''}`}
                onClick={() => onPriorityChange(activePriority === priority.id ? null : priority.id)}
                aria-pressed={activePriority === priority.id}
              >
                <span 
                  className={`priority-dot priority-dot-${priority.color}`} 
                  aria-hidden="true"
                />
                <span className="sidebar-label">{priority.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
