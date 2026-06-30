# Cloud Training Portal

A 10-phase hands-on training portal for new employees covering Linux, networking, Windows infrastructure, and AI-assisted workflows. Trainees work through interactive phases at their own pace; admins track progress and review submissions in real time.

**Live:** https://cloud-training.online

---

## Features

- 10 structured training phases from beginner to advanced
- Per-phase progress tracking with status, notes, and timestamps
- Interactive labs: Phase 1 ticket simulation, Phase 2 browser-based LAMP terminal (xterm.js + Docker)
- Admin dashboard: user management, analytics, and per-phase grade/feedback review
- Phase unlock enforcement — each phase requires the previous one to be passed
- Grade gate: a `not_passed` grade blocks the next phase until the employee resubmits
- JWT authentication with role-based access (`employee`, `admin`, `main_admin`)
- Admin accounts are protected from accidental deletion
- Real-time in-app chat between employees and admins (WebSocket)
- Persistent unread chat badge — survives page reloads via server-side read positions
- Grade notification emails sent to employees via Gmail SMTP
- Forgot password / email reset flow (1-hour token, Gmail SMTP)
- Pending-review badge on admin dashboard with instant updates
- Dark/light mode toggle
- **Admin phase editor** — edit phase content (title, description, objectives, tasks, tips, appearance) directly in the portal; Markdown with image upload; full revision history with one-click revert

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI + SQLite |
| Web server | nginx (static files + reverse proxy) |
| Auth | JWT (python-jose) + bcrypt |
| Terminal labs | xterm.js + Docker PTY over WebSocket |
| Real-time chat | WebSocket (`/api/chat/ws`) |
| Email | Gmail SMTP via `smtplib` |
| Markdown | react-markdown + remark-gfm |

---

## Project Structure

```
cloud-training/
├── web/
│   ├── deploy.sh               # One-command deploy for Alpine Linux
│   ├── nginx.conf              # nginx site config (WebSocket-capable)
│   ├── backend/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── database.py         # SQLAlchemy setup + runtime migrations + phase seed
│   │   ├── models.py           # User, PhaseProgress, Phase, PhaseRevision ORM models
│   │   ├── auth.py             # JWT creation/verification, password hashing
│   │   ├── email_utils.py      # Gmail SMTP helpers (grade notifications, password reset)
│   │   ├── requirements.txt
│   │   ├── seed_data/
│   │   │   └── phases.json     # Initial phase content seeded on first run
│   │   └── routers/
│   │       ├── auth.py         # Login, register, profile, forgot/reset password
│   │       ├── progress.py     # GET/PUT /api/progress/
│   │       ├── admin.py        # User management, phase review/reset
│   │       ├── analytics.py    # Admin analytics endpoints
│   │       ├── phases.py       # Phase content CRUD, image upload, revisions
│   │       ├── chat.py         # Real-time WebSocket chat + read positions
│   │       └── containers.py   # Docker PTY for LAMP lab (WebSocket)
│   └── frontend/
│       └── src/
│           ├── App.jsx         # Router and route guards
│           ├── contexts/
│           │   ├── AuthContext.jsx
│           │   ├── PhasesContext.jsx  # Fetches phases from DB; shared across app
│           │   └── ThemeContext.jsx   # Dark/light mode
│           ├── components/
│           │   ├── ChatWidget.jsx     # Floating chat bubble (all pages)
│           │   ├── PhaseEditor.jsx    # Admin phase content editor
│           │   ├── Navbar.jsx
│           │   ├── PhaseCard.jsx
│           │   └── ProgressRing.jsx
│           ├── pages/
│           │   ├── Dashboard.jsx
│           │   ├── PhaseDetail.jsx        # Renders description as Markdown; Edit button for admins
│           │   ├── TicketSimulation.jsx   # Phase 1 interactive lab
│           │   ├── LampLab.jsx            # Phase 2 terminal lab
│           │   ├── Profile.jsx            # Avatar, email, password change
│           │   ├── ForgotPassword.jsx
│           │   ├── ResetPassword.jsx
│           │   ├── Admin.jsx
│           │   └── AdminLampTerminal.jsx  # Admin view of lab sessions
│           └── data/
│               ├── phases.js             # Static metadata (difficulty colours, status labels)
│               └── simulationTickets.js  # Phase 1 ticket data
```

---

## Training Phases

| # | Title | Difficulty | Time |
|---|-------|-----------|------|
| 1 | Ticket Simulation | Beginner | 2–3 h |
| 2 | LAMP Project | Beginner | 3–4 h |
| 3 | Troubleshooting Lab | Intermediate | 4–5 h |
| 4 | Firewall Lab | Intermediate | 4–5 h |
| 5 | Windows Infrastructure | Intermediate | 5–6 h |
| 6 | Site-to-Site VPN | Advanced | 5–7 h |
| 7 | AI Ticket Handling | Intermediate | 3–4 h |
| 8 | cPanel Migration + DNS | Advanced | 6–8 h |
| 9 | AI Debugging | Advanced | 4–6 h |
| 10 | KVM Operations Lab | Advanced | 6–8 h |

Phase content (description, objectives, tasks, tips) is stored in SQLite and editable by admins without a redeploy. Phases 1 and 2 have browser-based interactive labs; Phases 3–10 are completed on CWM cloud VMs and submitted for admin review.

---

## Getting Started

### Deploy to Alpine Linux (one command)

```sh
cd /root/cloud-training/web
sh deploy.sh
```

This installs all dependencies, builds the frontend, configures nginx, and registers the API as an OpenRC service.

### Local Development

```sh
# Terminal 1 — backend
cd web/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd web/frontend
npm install
npm run dev   # Vite dev server on :5173, proxies /api → :8000
```

### Re-deploy after changes

```sh
# Backend only
rc-service cloud-training-api restart

# Frontend only
cd web/frontend && npm run build && cp -r dist/. /var/www/cloud-training/

# Both
cd web/frontend && npm run build && cp -r dist/. /var/www/cloud-training/ && rc-service cloud-training-api restart
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register (first user becomes admin) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Current user info |
| POST | `/api/auth/forgot-password` | — | Send password reset email |
| POST | `/api/auth/reset-password` | — | Reset password via token |
| PATCH | `/api/auth/me/password` | Bearer | Change password |
| PATCH | `/api/auth/me/email` | Bearer | Change email |
| POST | `/api/auth/me/avatar` | Bearer | Upload avatar image |

### Progress
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/progress/` | Bearer | All 10 phase records for current user |
| PUT | `/api/progress/{phase_id}` | Bearer | Update status + notes |
| PUT | `/api/progress/{phase_id}/simulation` | Bearer | Save Phase 1 simulation data |

### Phases (content)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/phases/` | — | List all 10 phases |
| GET | `/api/phases/{id}` | — | Get one phase |
| PUT | `/api/phases/{id}` | Admin | Update phase content |
| POST | `/api/phases/{id}/upload` | Admin | Upload image, returns URL |
| DELETE | `/api/phases/{id}/uploads/{filename}` | Admin | Delete uploaded image |
| GET | `/api/phases/{id}/revisions` | Admin | List revision history (last 20) |
| GET | `/api/phases/{id}/revisions/{rev_id}` | Admin | Get revision snapshot |
| POST | `/api/phases/{id}/revisions/{rev_id}/revert` | Admin | Revert to revision |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users with progress summary |
| GET | `/api/admin/users/{id}` | Full progress breakdown for one user |
| PATCH | `/api/admin/users/{id}/role` | Change role |
| DELETE | `/api/admin/users/{id}` | Delete user (blocked if admin) |
| POST | `/api/admin/users/{id}/progress/{phase_id}/review` | Submit grade + feedback |
| POST | `/api/admin/users/{id}/progress/{phase_id}/reset` | Reset a phase |
| GET | `/api/admin/analytics/summary` | KPI metrics |
| GET | `/api/admin/analytics/funnel` | Per-phase completion rates |
| GET | `/api/admin/analytics/users` | User progress table |
| GET | `/api/admin/analytics/cohorts` | Progress grouped by join month |

### Chat
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chat/users` | Bearer | List users with online/status info |
| GET | `/api/chat/history` | Bearer | Public channel history |
| GET | `/api/chat/dm/{user_id}` | Bearer | DM history with a user |
| GET | `/api/chat/unread` | Bearer | Unread counts per conversation |
| POST | `/api/chat/mark-read` | Bearer | Mark conversation as read |
| WS | `/api/chat/ws` | Bearer (token param) | Real-time WebSocket chat |

---

## Business Rules

- First registered user automatically becomes `admin`
- Admin accounts cannot be deleted — demote to `employee` first
- Admins cannot change their own role or delete themselves
- The `main_admin` role is immutable — cannot be assigned or removed via the API
- Phase N cannot be started until Phase N−1 is **passed** (grade = `passed`)
- A `not_passed` grade locks the current phase — employee must resubmit for re-review
- Admins bypass phase-lock and can view any phase directly
- Password reset tokens expire after 1 hour and are single-use

---

## Logs & Service Control

```sh
tail -f /var/log/cloud-training-api.log
rc-service cloud-training-api restart
rc-service nginx restart
```
