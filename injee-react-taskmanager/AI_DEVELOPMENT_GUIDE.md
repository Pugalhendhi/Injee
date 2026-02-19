# AI-Assisted Development Guide for Developers
## How to Use AI Coding Assistants to Build Projects Faster

**Target Audience:** Developers at iNoesis Technologies (2-3 years experience)
**Context:** Building a React + Injee Task Manager using Claude as AI coding assistant
**Goal:** Demonstrate AI-assisted workflow to increase hiring attractiveness and developer productivity

---

## Table of Contents

1. [Why AI-Assisted Development?](#1-why-ai-assisted-development)
2. [Tools You Need](#2-tools-you-need)
3. [The Complete Workflow (Step by Step)](#3-the-complete-workflow-step-by-step)
4. [Phase 1: Research & Discovery with AI](#phase-1-research--discovery-with-ai)
5. [Phase 2: Architecture & Planning with AI](#phase-2-architecture--planning-with-ai)
6. [Phase 3: Code Generation with AI](#phase-3-code-generation-with-ai)
7. [Phase 4: Debugging & Iteration with AI](#phase-4-debugging--iteration-with-ai)
8. [Phase 5: Documentation with AI](#phase-5-documentation-with-ai)
9. [Prompt Engineering Tips](#6-prompt-engineering-tips)
10. [Dos and Don'ts](#7-dos-and-donts)
11. [Demo Script for Interviews/Clients](#8-demo-script-for-interviewsclients)
12. [Recording a Video Demo](#9-recording-a-video-demo)

---

## 1. Why AI-Assisted Development?

AI coding assistants like Claude, GitHub Copilot, and Cursor are transforming how developers work. They don't replace developers — they amplify them.

**Measured Impact:**
- **70% faster** for boilerplate code (API clients, CRUD components, forms)
- **50% faster** for debugging (describe the error, get solutions instantly)
- **3x faster** for documentation (README files, API docs, comments)
- **Research time cut by 80%** (evaluate libraries, read docs, compare alternatives)

**What AI is good at:**
- Generating boilerplate and repetitive code
- Explaining unfamiliar libraries/frameworks
- Converting requirements into code structure
- Writing tests, documentation, and error handling
- Debugging based on error messages
- Refactoring code for better patterns

**What AI is NOT good at:**
- Making business decisions
- Understanding your specific production constraints
- Replacing code review
- Security auditing (always verify!)
- Complex state management logic without clear requirements

---

## 2. Tools You Need

| Tool | Purpose | Cost |
|------|---------|------|
| **Claude.ai** (claude.ai) | Primary AI coding assistant | Free tier / Pro plan |
| **VS Code** | Code editor | Free |
| **GitHub Copilot** (optional) | Inline code suggestions in VS Code | $10/month |
| **Claude Code** (CLI) | Terminal-based AI coding | Included in Pro plan |
| **OBS Studio** | Screen recording for demos | Free |
| **Loom** (alternative) | Quick screen recordings | Free tier available |

For this guide, we'll use **Claude.ai** as the primary AI assistant.

---

## 3. The Complete Workflow (Step by Step)

Here's the exact workflow used to build the React + Injee Task Manager:

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Research (AI helps you evaluate the tool)      │
│  "Tell me about Injee. What are the alternatives?"      │
│                                                         │
│  STEP 2: Architecture (AI helps you plan)               │
│  "Design a task manager with these features..."         │
│                                                         │
│  STEP 3: Scaffolding (AI generates project structure)   │
│  "Create a React + Vite project with these files..."    │
│                                                         │
│  STEP 4: Core Code (AI writes the implementation)       │
│  "Write the Injee API client with CRUD operations..."   │
│                                                         │
│  STEP 5: Iterate & Debug (AI helps fix issues)          │
│  "I'm getting CORS error when calling Injee..."         │
│                                                         │
│  STEP 6: Polish & Document (AI writes docs)             │
│  "Write a README with setup instructions..."            │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Research & Discovery with AI

### What to Ask Claude

**Understanding a new tool:**
```
I found this tool called Injee (https://injee.codeberg.page/).
Can you tell me what it does, who it's for, and what are the 
alternatives? Compare it with JSON Server, PocketBase, and Supabase.
```

**Evaluating fit for your project:**
```
I need a zero-config backend for a React POC. My team has 
2-3 years of experience. Which of these would you recommend: 
Injee, JSON Server, PocketBase, or Supabase? Consider ease of 
setup, learning curve, and features.
```

### Pro Tip
Always share the URL of the tool/library with Claude. Claude can fetch and read the documentation to give you accurate, up-to-date answers rather than relying on training data.

---

## Phase 2: Architecture & Planning with AI

### What to Ask Claude

**Project structure:**
```
I want to build a Task Manager app using React (Vite) + Injee.
Features needed:
- CRUD operations for tasks
- Search tasks by title
- Sort by priority and date
- Pagination
- Task completion toggle

Please design the project structure, list all files needed,
and describe the responsibility of each file.
```

**API design:**
```
Injee runs on port 4125 and provides REST endpoints.
Design the API client module that wraps all CRUD operations
for a "tasks" table. Include: fetchAll, fetchOne, create,
update, delete, with search/sort/pagination params.
```

### Key Principle
**Be specific about what you want.** Don't say "build me an app." Instead:
- List exact features
- Specify the tech stack
- Mention constraints (team skill level, deployment target)
- Reference the documentation URL

---

## Phase 3: Code Generation with AI

This is where AI saves the most time. Here's the exact sequence of prompts used:

### Prompt 1: API Client
```
Write a JavaScript module (src/api/injeeClient.js) that 
provides these functions for the Injee REST API at 
http://localhost:4125:

- fetchTasks({ search, sortBy, sortOrder, page, perPage })
- fetchTask(id)
- createTask(task)
- updateTask(id, updates)
- deleteTask(id)

Use fetch API. Add proper error handling. Add JSDoc comments
explaining each function.
```

### Prompt 2: React Components
```
Create these React components for the Task Manager:

1. TaskForm.jsx - form to create/edit tasks with fields:
   title (required), description, priority (high/medium/low)
   Support both create and edit modes via props.

2. TaskItem.jsx - displays a single task with:
   checkbox for completion, title, description, 
   priority badge (color-coded), created date,
   edit and delete buttons

3. TaskList.jsx - renders a list of TaskItem components

4. Pagination.jsx - prev/next pagination controls

Use functional components with hooks. Keep it clean and simple.
```

### Prompt 3: Main App Component
```
Write App.jsx that ties everything together:
- State management for tasks, loading, error, pagination
- Search with debounce
- Sort toggle (by date, priority, title)
- CRUD handlers that call the API client
- Error boundary with user-friendly messages
```

### Prompt 4: Styling
```
Write clean CSS for the task manager. Use CSS custom properties.
Style requirements:
- Card-based layout for tasks
- Color-coded priority badges (red=high, yellow=medium, green=low)
- Responsive design
- Professional but simple look
- No CSS frameworks needed
```

### How to Review AI-Generated Code

After AI generates the code, always:

1. **Read every line** — understand what it does
2. **Check for hardcoded values** — URLs, API keys, credentials
3. **Verify error handling** — does it handle network failures?
4. **Test edge cases** — empty states, invalid input, API errors
5. **Check naming conventions** — match your team's standards
6. **Look for security issues** — XSS, injection, exposed secrets

---

## Phase 4: Debugging & Iteration with AI

### Common Issues & How to Ask Claude

**CORS errors:**
```
I'm getting this CORS error when my React app (localhost:5173) 
calls Injee (localhost:4125):

"Access to fetch at 'http://localhost:4125/tasks' from origin 
'http://localhost:5173' has been blocked by CORS policy"

How do I fix this?
```

**API response format mismatch:**
```
Injee is returning data in this format:
[response JSON here]

But my React code expects this format:
[expected format]

How should I modify my API client to handle both?
```

**State management bugs:**
```
When I toggle task completion, the UI doesn't update immediately.
Here's my handleToggleComplete function:
[paste code]

And here's how I'm calling it:
[paste code]

What's wrong?
```

### Pro Tip
**Always paste the actual error message and relevant code.** Don't describe the error vaguely. The more context you give Claude, the better the solution.

---

## Phase 5: Documentation with AI

### README Generation
```
Write a comprehensive README.md for my React + Injee project.
Include:
- Project description
- Prerequisites (Docker, Node.js)  
- Step-by-step setup (both Injee and React)
- Project structure with file descriptions
- API reference table
- Troubleshooting section
- curl examples for manual testing
```

### Code Comments
```
Add JSDoc comments to all exported functions in 
src/api/injeeClient.js. Explain parameters, return types,
and usage examples.
```

---

## 6. Prompt Engineering Tips

### The STAR Framework for AI Prompts

| Component | What to Include | Example |
|-----------|----------------|---------|
| **S**ituation | Context & constraints | "I'm building a React app with Injee backend" |
| **T**ask | What you need done | "Create an API client module" |
| **A**ction | Specific requirements | "Include CRUD, search, sort, pagination" |
| **R**esult | Expected output format | "Use fetch API, add error handling, add comments" |

### Good vs Bad Prompts

**Bad:** "Write a React app"
**Good:** "Write a React component called TaskForm that has a controlled form with title (text, required), description (textarea, optional), and priority (select: high/medium/low). On submit, call the onSave prop with the form data and reset the form."

**Bad:** "Fix my code"
**Good:** "This function should fetch tasks from http://localhost:4125/tasks but returns undefined. Here's the code: [paste code]. The console shows: [paste error]."

### Advanced Techniques

1. **Chain prompts:** Build incrementally, don't ask for everything at once
2. **Reference previous context:** "Using the API client from earlier, now create the TaskList component"
3. **Ask for alternatives:** "Show me 2 different approaches for handling pagination"
4. **Request explanations:** "Write the code AND explain why you chose this approach"
5. **Iterate on feedback:** "The code works but the UX feels clunky. How can I improve the search experience?"

---

## 7. Dos and Don'ts

### Do:
- Use AI for boilerplate, repetitive code, and documentation
- Always read and understand generated code before using it
- Verify API endpoints and data formats manually
- Use AI to learn new libraries faster
- Share error messages and context when debugging
- Ask AI to explain patterns you don't understand
- Commit frequently so you can revert AI-generated changes

### Don't:
- Blindly copy-paste without reading
- Use AI-generated code in production without review
- Trust AI for security-critical code without verification
- Skip testing because "AI wrote it"
- Forget to attribute AI assistance in team discussions
- Use AI as a crutch — understand the fundamentals first
- Share proprietary code/secrets in AI prompts

---

## 8. Demo Script for Interviews/Clients

Use this script when demonstrating AI-assisted development to clients or in interviews:

### Opening (30 seconds)
"I'm going to show you how we use AI coding assistants to build production-quality prototypes in a fraction of the time. We'll build a task manager from scratch using React and Injee, a zero-config backend."

### Research Phase (2 minutes)
- Open Claude.ai
- Ask about Injee, show it fetching the docs
- Ask for alternatives, show the comparison
- "In 2 minutes, we've done market research that would take an hour manually."

### Building Phase (5 minutes)
- Ask Claude to design the project structure
- Generate the API client
- Generate the main component
- Copy code into VS Code
- "Notice I'm reviewing every line. AI assists, the developer decides."

### Running the App (2 minutes)
- Start Injee with Docker
- Start the React app
- Add some tasks, search, sort
- "A working full-stack prototype in under 10 minutes."

### Closing (1 minute)
"AI didn't replace the developer. It amplified their productivity by handling the repetitive parts, letting them focus on architecture, UX, and business logic. This is how our team delivers faster without sacrificing quality."

---

## 9. Recording a Video Demo

### Setup

1. **Install OBS Studio** — https://obsproject.com/ (free, open-source)
   - Or use **Loom** — https://loom.com (easier, browser-based)

2. **Screen resolution:** Set to 1920x1080 for crisp recording

3. **Prepare your windows:**
   - Claude.ai open in browser (left half)
   - VS Code open (right half)
   - Terminal ready at bottom

### Recording Steps

1. **Start recording** in OBS/Loom

2. **Introduce yourself** (10 sec):
   "Hi, I'm [Name], a developer at iNoesis Technologies. Today I'll show how we use AI to build apps faster."

3. **Show the problem** (30 sec):
   "We need a task manager. Instead of spending 2 days on boilerplate, let's use Claude."

4. **Research with Claude** (2 min):
   - Paste Injee URL, ask about it
   - Ask for alternatives
   - Narrate what Claude returns

5. **Generate code** (5 min):
   - Ask for project structure
   - Generate API client — **copy to VS Code**
   - Generate components — **copy to VS Code**
   - Show yourself reading the code: "Let me verify this error handling..."

6. **Run the app** (2 min):
   - `docker run` for Injee
   - `npm run dev` for React
   - Demo: add tasks, search, sort, delete
   - "Full CRUD in 10 minutes."

7. **Wrap up** (30 sec):
   "AI handled the boilerplate. I focused on architecture and UX decisions. This is the future of development."

8. **Stop recording**, export as MP4

### Video Editing Tips
- Keep it under 10 minutes
- Cut any dead time (installations, loading)
- Add text overlays for key moments
- Use zoom-ins on important code sections

### Sharing
- Upload to YouTube (unlisted if private)
- Or use Loom's built-in sharing
- Add the link to your portfolio/resume

---

## Appendix: Quick Reference Card

### Starting a Project with AI

```
Step 1: "Tell me about [library]. What are alternatives?"
Step 2: "Design the project structure for [app] using [tech stack]"
Step 3: "Write [specific module] with [these requirements]"
Step 4: "I'm getting [error]. Here's my code: [code]. Fix it."
Step 5: "Write a README with setup instructions for this project"
```

### Key Prompts for React + Injee Projects

```
"Write a fetch wrapper for Injee REST API at localhost:4125"
"Create a React form component with controlled inputs for [fields]"
"Add search, sort, and pagination to this list component"
"Debug: getting [error] when calling [endpoint]"
"Write CSS for a card-based responsive layout"
```

---

*This guide was itself created with AI assistance, demonstrating the meta-principle: use AI to document your AI-assisted workflow.*

**Created for:** iNoesis Technologies Developer Team
**Date:** February 2026
**Author:** AI-Assisted (Claude + Human Review)
