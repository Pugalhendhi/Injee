import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask } from './api/injeeClient';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import Pagination from './components/Pagination';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Search, Sort & Pagination state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 5;

  // Fetch tasks from Injee
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks({ search, sortBy, sortOrder, page, perPage });
      // Injee may return an array directly or a paginated object
      if (Array.isArray(data)) {
        setTasks(data);
        setTotalPages(Math.ceil(data.length / perPage) || 1);
      } else if (data && data.records) {
        setTasks(data.records);
        setTotalPages(data.total_pages || Math.ceil(data.total / perPage) || 1);
      } else if (data && data.data) {
        setTasks(data.data);
        setTotalPages(data.total_pages || 1);
      } else {
        // Fallback: treat response as array
        setTasks(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(
        'Could not connect to Injee. Make sure it is running on http://localhost:4125. ' +
        'See README.md for setup instructions.'
      );
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, page, perPage]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Create or Update task
  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, { ...editingTask, ...taskData });
        setEditingTask(null);
      } else {
        await createTask(taskData);
      }
      await loadTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Failed to save task. Please try again.');
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  // Toggle completion
  const handleToggleComplete = async (task) => {
    try {
      await updateTask(task.id, { ...task, completed: !task.completed });
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  // Search handler with debounce reset to page 1
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  // Sort handler
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>📋 Task Manager</h1>
          <p className="subtitle">
            Powered by <a href="https://injee.codeberg.page/" target="_blank" rel="noopener noreferrer">Injee</a> + React
          </p>
        </div>
      </header>

      <main className="app-main">
        {/* Task Form */}
        <section className="section">
          <h2>{editingTask ? '✏️ Edit Task' : '➕ Add New Task'}</h2>
          <TaskForm
            onSave={handleSaveTask}
            editingTask={editingTask}
            onCancel={handleCancelEdit}
          />
        </section>

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Search & Sort Controls */}
        <section className="section">
          <div className="controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="sort-controls">
              <span className="sort-label">Sort by:</span>
              {['created_at', 'priority', 'title'].map((field) => (
                <button
                  key={field}
                  className={`sort-btn ${sortBy === field ? 'active' : ''}`}
                  onClick={() => handleSortChange(field)}
                >
                  {field === 'created_at' ? 'Date' : field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Task List */}
        <section className="section">
          {loading ? (
            <div className="loading">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks found. {search ? 'Try a different search.' : 'Add your first task above!'}</p>
            </div>
          ) : (
            <>
              <TaskList
                tasks={tasks}
                onDelete={handleDeleteTask}
                onEdit={handleEditTask}
                onToggleComplete={handleToggleComplete}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Built with <a href="https://injee.codeberg.page/" target="_blank" rel="noopener noreferrer">Injee</a> (zero-config backend) +{' '}
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a> |{' '}
          AI-assisted development demo
        </p>
      </footer>
    </div>
  );
}

export default App;
