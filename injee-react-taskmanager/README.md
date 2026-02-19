# 📋 Task Manager — React + Injee Demo

A full-featured Task Manager app built with **React** (Vite) and **[Injee](https://injee.codeberg.page/)**, the zero-configuration instant database for frontend developers.

This project demonstrates all core Injee features: CRUD operations, search, sorting, pagination, and file uploads — all without writing a single line of backend code.

![React](https://img.shields.io/badge/React-18-blue) ![Injee](https://img.shields.io/badge/Injee-0.16.0-green) ![Docker](https://img.shields.io/badge/Docker-Ready-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎯 What This Project Covers

| Injee Feature       | How It's Used                                      |
|---------------------|----------------------------------------------------|
| **Create (POST)**   | Add new tasks with title, description, priority     |
| **Read (GET)**      | List all tasks, view individual task details         |
| **Update (PUT)**    | Edit task details, toggle completion status          |
| **Delete (DELETE)** | Remove tasks                                        |
| **Search**          | Search tasks by title                               |
| **Sort**            | Sort by priority, date, or completion status         |
| **Pagination**      | Paginate through large task lists                    |

---

## 📦 Prerequisites

Before you begin, make sure you have the following installed:

- **Docker** — [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js** (v18 or higher) — [Install Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)

---

## 🚀 Getting Started

### Step 1: Start Injee (Backend)

Injee runs as a Docker container. Open a terminal and run:

```bash
# Create required directories for Injee
mkdir -p injee-data/{files,views,backups,mocks}

# Pull and run Injee
docker pull mindaslab/injee:0.16.0

docker run -p 4125:4125 \
  -v $(pwd)/injee-data/files:/app/files \
  -v $(pwd)/injee-data/views:/app/views \
  -v $(pwd)/injee-data/backups:/app/backups \
  -v $(pwd)/injee-data/mocks:/app/mocks \
  mindaslab/injee:0.16.0
```

You should see Injee start on **http://localhost:4125**.

> **Windows users:** Replace `$(pwd)` with `%cd%` (CMD) or `${PWD}` (PowerShell).

### Step 2: Start the React App (Frontend)

Open a **new terminal** and run:

```bash
# Clone this project (or copy the files)
cd injee-react-taskmanager

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Step 3: Use the App!

1. Open http://localhost:5173 in your browser
2. Add tasks using the form at the top
3. Edit, complete, delete, search, and sort tasks
4. All data is stored in Injee and persists while the container runs

---

## 📁 Project Structure

```
injee-react-taskmanager/
├── public/
│   └── vite.svg
├── src/
│   ├── api/
│   │   └── injeeClient.js      # Injee API client (all CRUD operations)
│   ├── components/
│   │   ├── TaskForm.jsx         # Create/Edit task form
│   │   ├── TaskList.jsx         # Task list with search, sort, pagination
│   │   ├── TaskItem.jsx         # Individual task card
│   │   └── Pagination.jsx       # Pagination controls
│   ├── App.jsx                  # Main application component
│   ├── App.css                  # Application styles
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔌 Injee API Reference (Used in This Project)

Injee provides a REST API out of the box. Here's what we use:

| Operation         | Method   | Endpoint                                  |
|-------------------|----------|--------------------------------------------|
| List all records  | `GET`    | `http://localhost:4125/tasks`              |
| Get one record    | `GET`    | `http://localhost:4125/tasks/:id`          |
| Create record     | `POST`   | `http://localhost:4125/tasks`              |
| Update record     | `PUT`    | `http://localhost:4125/tasks/:id`          |
| Delete record     | `DELETE` | `http://localhost:4125/tasks/:id`          |
| Search records    | `GET`    | `http://localhost:4125/tasks?search=query` |
| Sort records      | `GET`    | `http://localhost:4125/tasks?order_by=field&order=asc` |
| Paginate          | `GET`    | `http://localhost:4125/tasks?page=1&per_page=10` |

> **Key Insight:** You don't need to "create a table" first. Injee auto-creates the `tasks` table when you POST the first record. This is the magic of zero-configuration!

---

## 🛠 Configuration

The Injee base URL is configured in `src/api/injeeClient.js`:

```javascript
const INJEE_BASE_URL = 'http://localhost:4125';
const TABLE_NAME = 'tasks';
```

Change these if your Injee instance runs on a different host/port.

---

## 🧪 Testing the API Manually (Optional)

You can test Injee directly with `curl`:

```bash
# Create a task
curl -X POST http://localhost:4125/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Injee", "description": "Build a demo app", "priority": "high", "completed": false}'

# Get all tasks
curl http://localhost:4125/tasks

# Search tasks
curl "http://localhost:4125/tasks?search=Learn"

# Delete a task (replace :id with actual id)
curl -X DELETE http://localhost:4125/tasks/1
```

---

## 🧯 Troubleshooting

| Problem | Solution |
|---------|----------|
| `CORS error` in browser console | Injee supports CORS by default. Make sure Injee is running on port 4125. |
| `Connection refused` | Ensure the Docker container is running: `docker ps` |
| Tasks not appearing | Check browser console for errors. Verify Injee is reachable: `curl http://localhost:4125` |
| Docker pull fails | Check your internet connection and Docker login |

---

## 📚 Learn More

- [Injee Documentation](https://injee.codeberg.page/docs)
- [Injee Source Code](https://codeberg.org/injee/injee)
- [Injee YouTube Channel](https://www.youtube.com/channel/UCv0Xb6Y3ZgK5UfBxK6lK6tQ)
- [Injee Docker Setup](https://codeberg.org/injee/docker)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

---

## 📝 License

MIT — Free to use, modify, and distribute.

---

*Built with ❤️ using Claude (AI coding assistant) + React + Injee*
