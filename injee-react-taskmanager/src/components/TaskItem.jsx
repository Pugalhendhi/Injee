function TaskItem({ task, onDelete, onEdit, onToggleComplete }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={!!task.completed}
        onChange={() => onToggleComplete(task)}
        title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      />

      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.description && (
          <div className="task-description">{task.description}</div>
        )}
        <div className="task-meta">
          {task.priority && (
            <span className={`priority-badge priority-${task.priority}`}>
              {task.priority}
            </span>
          )}
          {task.created_at && (
            <span className="task-date">{formatDate(task.created_at)}</span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(task)}
          title="Edit task"
        >
          ✏️
        </button>
        <button
          className="btn-icon delete"
          onClick={() => onDelete(task.id)}
          title="Delete task"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default TaskItem;
