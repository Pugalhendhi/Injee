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
    <article 
      className={`task-item ${task.completed ? 'completed' : ''}`}
      aria-labelledby={`task-title-${task.id}`}
    >
      <input
        type="checkbox"
        className="task-checkbox"
        checked={!!task.completed}
        onChange={() => onToggleComplete(task)}
        title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        id={`task-checkbox-${task.id}`}
        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
      />

      <div className="task-content">
        <div 
          className="task-title" 
          id={`task-title-${task.id}`}
        >
          {task.title}
        </div>
        {task.description && (
          <div className="task-description">{task.description}</div>
        )}
        <div className="task-meta">
          {task.priority && (
            <span 
              className={`priority-badge priority-${task.priority}`}
              role="status"
              aria-label={`Priority: ${task.priority}`}
            >
              {task.priority}
            </span>
          )}
          {task.created_at && (
            <time 
              className="task-date" 
              dateTime={task.created_at}
              aria-label={`Created on ${formatDate(task.created_at)}`}
            >
              {formatDate(task.created_at)}
            </time>
          )}
        </div>
      </div>

      <div className="task-actions" role="group" aria-label="Task actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(task)}
          aria-label={`Edit task: ${task.title}`}
          title="Edit task"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          className="btn-icon delete"
          onClick={() => onDelete(task)}
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </article>
  );
}

export default TaskItem;
