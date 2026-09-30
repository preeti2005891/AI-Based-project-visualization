# ProjectPulse: AI-Based Project Visualization and Progress Tracking System

A full-stack web app for managing multiple projects, assigning tasks, tracking progress on a Kanban board, and getting AI-generated project insights.

**Stack:** React (Vite) · Node.js + Express · SQLite (better-sqlite3) · optional Claude API

---

## Features

| Feature | Description |
|---|---|
| Multiple projects | Dashboard with progress, status breakdown and deadline badge for every project |
| Task assignment | Assign tasks to team members and see the workload per person |
| Kanban / status view | To Do, In Progress, Review and Done columns with drag and drop |
| Progress display | Progress percentage, stacked status bars, overall progress across projects |
| Deadline and completion tracking | Project and task deadlines, overdue flags, completion timestamps |
| AI insights | Risk level, projected finish date, planned vs. actual progress, recommendations |

## Screenshots

Add screenshots to a `docs/` folder and link them here:

```
![Dashboard](docs/dashboard.png)
![Kanban board](docs/board.png)
```

## Project structure

```
project-tracker/
├── package.json          # root scripts (install:all, dev, build, start)
├── .env.example          # optional AI settings
├── server/
│   ├── index.js          # REST API (Express)
│   ├── db.js             # SQLite schema and demo data
│   └── insights.js       # metrics, rule engine and Claude integration
└── client/
    └── src/
        ├── App.jsx, Dashboard.jsx, Project.jsx
        ├── api.js, util.jsx, styles.css
        └── main.jsx
```

## Getting started

**Requirements:** Node.js 18 or newer.

```bash
# 1. Install dependencies for root, server and client
npm run install:all

# 2. Start the API and the web app together
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

Demo projects and team members are created automatically on first run.

### Production build

```bash
npm run build
npm start        # serves the API and the built client on http://localhost:3001
```

## AI insights (optional)

The server always computes the project metrics: progress, overdue tasks, velocity over the last 14 days, projected finish date, and workload.

- **Without an API key:** a built-in rule engine writes the summary and recommendations.
- **With an API key:** Claude writes them from the same metrics.

```bash
cp .env.example .env            # then edit .env
export ANTHROPIC_API_KEY=your_key_here     # Windows: set ANTHROPIC_API_KEY=your_key_here
npm run dev
```

Never commit your real key. `.env` is already listed in `.gitignore`.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET / POST | `/api/members` | List or add team members |
| DELETE | `/api/members/:id` | Remove a member (their tasks become unassigned) |
| GET / POST | `/api/projects` | List projects with progress, or create one |
| GET / PATCH / DELETE | `/api/projects/:id` | Get a project with tasks, edit it, or delete it |
| POST | `/api/projects/:id/tasks` | Add a task |
| PATCH / DELETE | `/api/tasks/:id` | Update status, assignee, due date, priority, title, or delete |
| GET | `/api/projects/:id/insights` | Metrics plus AI or rule-based insights |

## Troubleshooting

- **`better-sqlite3` fails to install:** use a current Node LTS version. On Linux you may need build tools (`sudo apt install build-essential python3`).
- **Port already in use:** set another port with `PORT=4000 npm start` (and update the proxy in `client/vite.config.js` for dev).
- **Reset the demo data:** stop the server and delete `server/data.db*`.

## Roadmap

- User login with roles (admin, manager, member)
- Email or in-app reminders for overdue tasks
- Burndown charts and exportable reports
- PostgreSQL support for multi-server deployments

## Author

Your Name  preeti patil

## License

Add a `LICENSE` file (for example MIT) before publishing.
