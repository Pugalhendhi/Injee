/**
 * Injee API Client
 *
 * This module wraps all REST API calls to Injee.
 * Injee auto-creates tables on first POST — no setup required!
 *
 * Injee runs on http://localhost:4125 by default (Docker).
 * In development, requests are proxied through Vite to avoid CORS issues.
 */

// Use relative path for proxy in development, direct URL in production
const INJEE_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:4125';
const TABLE_NAME = 'tasks';

const API_URL = `${INJEE_BASE_URL}/${TABLE_NAME}`;

/**
 * GET /tasks — Fetch all tasks
 * Supports optional query params: search, order_by, order, page, per_page
 */
export async function fetchTasks({ search = '', sortBy = '', sortOrder = 'asc', page = 1, perPage = 5 } = {}) {
  const params = new URLSearchParams();

  if (search) params.append('search', search);
  if (sortBy) {
    params.append('order_by', sortBy);
    params.append('order', sortOrder);
  }
  params.append('page', page);
  params.append('per_page', perPage);

  const url = `${API_URL}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  return response.json();
}

/**
 * GET /tasks/:id — Fetch a single task by ID
 */
export async function fetchTask(id) {
  const response = await fetch(`${API_URL}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch task ${id}: ${response.status}`);
  }

  return response.json();
}

/**
 * POST /tasks — Create a new task
 * Injee auto-creates the "tasks" table on first POST.
 */
export async function createTask(task) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...task,
      completed: false,
      created_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.status}`);
  }

  return response.json();
}

/**
 * PUT /tasks/:id — Update an existing task
 */
export async function updateTask(id, updates) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task ${id}: ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE /tasks/:id — Delete a task
 */
export async function deleteTask(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task ${id}: ${response.status}`);
  }

  return response.json();
}
