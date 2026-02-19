import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask } from './api/injeeClient';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import Pagination from './components/Pagination';
import { ToastProvider, showToast } from './components/Toast';
import Modal from './components/Modal';
import Sidebar from './components/Sidebar';
import './App.css';

function AppContent() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePriority, setActivePriority] = useState(null);

  // Search, Sort & Pagination state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 5;

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, task: null });
  const searchInputRef = useRef(null);
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Calculate task counts for sidebar
  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      active: tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
    };
  }, [tasks]);

  // Fetch tasks from Injee
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks({ 
        search: debouncedSearch, 
        sortBy, 
        sortOrder, 
        page, 
        perPage 
      });
      
      let fetchedTasks = [];
      if (Array.isArray(data)) {
        fetchedTasks = data;
      } else if (data && data.records) {
        fetchedTasks = data.records;
      } else if (data && data.data) {
        fetchedTasks = data.data;
      } else {
        fetchedTasks = Array.isArray(data) ? data : [];
      }
      
      // Apply client-side filtering for status
      if (activeFilter === 'active') {
        fetchedTasks = fetchedTasks.filter(t => !t.completed);
      } else if (activeFilter === 'completed') {
        fetchedTasks = fetchedTasks.filter(t => t.completed);
      }
      
      // Apply client-side filtering for priority
      if (activePriority) {
        fetchedTasks = fetchedTasks.filter(t => t.priority === activePriority);
      }
      
      setTasks(fetchedTasks);
      setTotalPages(Math.ceil(fetchedTasks.length / perPage) || 1);
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
  }, [debouncedSearch, sortBy, sortOrder, page, perPage, activeFilter, activePriority]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, activePriority, sortBy, sortOrder]);

  // Create or Update task
  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, { ...editingTask, ...taskData });
        setEditingTask(null);
        showToast('Task updated successfully!', 'success');
      } else {
        await createTask(taskData);
        showToast('Task created successfully!', 'success');
      }
      await loadTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
      showToast('Failed to save task. Please try again.', 'error');
      setError('Failed to save task. Please try again.');
    }
  };

  // Delete task - now with modal confirmation
  const handleDeleteTask = (task) => {
    setDeleteModal({ isOpen: true, task });
  };

  const confirmDelete = async () => {
    if (!deleteModal.task) return;
    
    try {
      await deleteTask(deleteModal.task.id);
      showToast('Task deleted successfully!', 'success');
      setDeleteModal({ isOpen: false, task: null });
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      showToast('Failed to delete task. Please try again.', 'error');
      setError('Failed to delete task. Please try again.');
      setDeleteModal({ isOpen: false, task: null });
    }
  };

  // Toggle completion
  const handleToggleComplete = async (task) => {
    try {
      await updateTask(task.id, { ...task, completed: !task.completed });
      await loadTasks();
      showToast(
        task.completed ? 'Task marked as incomplete' : 'Task completed!', 
        'success'
      );
    } catch (err) {
      console.error('Failed to update task:', err);
      showToast('Failed to update task.', 'error');
    }
  };

  // Edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    // Smooth scroll to form instead of jumping
    const formSection = document.getElementById('task-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  // Search handler
  const handleSearchChange = (value) => {
    setSearch(value);
  };

  // Sort handler with user-friendly labels
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilter('all');
    setActivePriority(null);
    setSearch('');
    setSortBy('');
  };

  const hasActiveFilters = activeFilter !== 'all' || activePriority || search;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="header-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1>Task Manager</h1>
              <p className="subtitle">
                Powered by <a href="https://injee.codeberg.page/" target="_blank" rel="noopener noreferrer">Injee</a> + React
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          activePriority={activePriority}
          onPriorityChange={setActivePriority}
          taskCounts={taskCounts}
        />

        {/* Main Content */}
        <main className="app-main">
          {/* Task Form */}
          <section className="section" id="task-form">
            <div className="task-form-header">
              <h2>{editingTask ? '✏️ Edit Task' : '➕ Add New Task'}</h2>
              {editingTask && (
                <button 
                  className="btn-ghost"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
            <TaskForm
              onSave={handleSaveTask}
              editingTask={editingTask}
              onCancel={handleCancelEdit}
            />
          </section>

          {/* Error Banner - Now as toast instead of banner */}
          {error && (
            <div className="error-banner" role="alert">
              <span>⚠️</span>
              <p>{error}</p>
              <button onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
            </div>
          )}

          {/* Controls Bar */}
          <section className="section">
            <div className="controls-bar">
              <div className="search-wrapper">
                <div className="search-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
                  aria-label="Search tasks"
                />
                {search && (
                  <button 
                    className="search-clear"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="controls-right">
                {hasActiveFilters && (
                  <button 
                    className="btn-ghost"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </button>
                )}
                
                <div className="sort-dropdown">
                  <label htmlFor="sort-select" className="sr-only">Sort by</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="sort-select"
                  >
                    <option value="">Sort by</option>
                    <option value="created_at">Date Added</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                  </select>
                  {sortBy && (
                    <span className="sort-indicator" aria-hidden="true">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Task List */}
          <section className="section">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner" aria-hidden="true"></div>
                <p>Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3>No tasks found</h3>
                <p>
                  {hasActiveFilters 
                    ? 'Try adjusting your filters or search terms.' 
                    : 'Get started by adding your first task above!'}
                </p>
                {hasActiveFilters && (
                  <button 
                    className="btn-primary"
                    onClick={handleClearFilters}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="task-count" role="status" aria-live="polite">
                  Showing <strong>{tasks.length}</strong> task{tasks.length !== 1 ? 's' : ''}
                </div>
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
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Built with <a href="https://injee.codeberg.page/" target="_blank" rel="noopener noreferrer">Injee</a> (zero-config backend) +{' '}
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a> |{' '}
          AI-assisted development demo
        </p>
      </footer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, task: null })}
        onConfirm={confirmDelete}
        title="Delete Task"
        confirmText="Delete"
        type="danger"
      >
        <p>Are you sure you want to delete this task?</p>
        <p><strong>"{deleteModal.task?.title}"</strong></p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
