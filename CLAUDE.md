# Cloud Training Program

A 10-phase hands-on training portal for new employees covering Linux, Windows, networking, and AI-assisted workflows. All training happens through a web interface accessed from each employee's browser.

---

## Server

| Field   | Value                        |
|---------|------------------------------|
| OS      | Alpine Linux (BusyBox-based) |
| IP      | 79.108.163.7                 |
| Host    | CWM (Cloud With Me)          |
| Note    | Claude Code runs directly on this server — no SSH needed |

---

## Stack

| Layer      | Technology                          | Notes |
|------------|-------------------------------------|-------|
| Frontend   | React 18 + Vite + Tailwind CSS      | Built to static files, served by nginx |
| Backend    | FastAPI + SQLite                    | Lightweight Python REST API |
| Web server | nginx                               | Serves static files; proxies `/api/*` to FastAPI |
| Auth       | JWT (python-jose), bcrypt           | 8-hour tokens; `sub` claim must be a string |
| Database   | SQLite (`web/backend/training.db`)  | Not committed to git |

---

## Project Layout

```
cloud-training/
├── CLAUDE.md
├── .gitignore
└── web/
    ├── deploy.sh               # One-command deploy (Alpine Linux)
    ├── nginx.conf              # nginx site config
    ├── backend/
    │   ├── main.py             # FastAPI app entry point
    │   ├── database.py         # SQLAlchemy + SQLite setup
    │   ├── models.py           # User, PhaseProgress ORM models
    │   ├── auth.py             # JWT creation/verification, password hashing
    │   ├── requirements.txt    # Python dependencies
    │   └── routers/
    │       ├── auth.py         # POST /api/auth/login|register, GET /api/auth/me
    │       ├── progress.py     # GET/PUT /api/progress/
    │       └── admin.py        # GET/PATCH/DELETE /api/admin/users/
    └── frontend/
        ├── index.html
        ├── package.json
        ├── vite.config.js      # Dev proxy: /api → localhost:8000
        ├── tailwind.config.js
        ├── postcss.config.js
        └── src/
            ├── main.jsx
            ├── App.jsx         # Router, route guards (ProtectedLayout, AdminGuard, GuestGuard)
            ├── index.css       # Tailwind + custom utility classes
            ├── api/
            │   └── client.js   # fetch wrapper; login uses form encoding
            ├── contexts/
            │   └── AuthContext.jsx   # user state, login/register/logout
            ├── components/
            │   ├── Navbar.jsx
            │   ├── PhaseCard.jsx
            │   └── ProgressRing.jsx  # SVG circular progress indicator
            ├── data/
            │   └── phases.js   # All 10 phase definitions (static content)
            └── pages/
                ├── Login.jsx
                ├── Dashboard.jsx
                ├── PhaseDetail.jsx
                └── Admin.jsx
```

---

## Training Phases

| # | Title | Difficulty | Est. Time |
|---|-------|-----------|-----------|
| 1 | Ticket Simulation | Beginner | 2–3 h |
| 2 | LAMP Project | Beginner | 3–4 h |
| 3 | Troubleshooting Lab (Advanced) | Intermediate | 4–5 h |
| 4 | Firewall Lab | Intermediate | 4–5 h |
| 5 | Windows Infrastructure | Intermediate | 5–6 h |
| 6 | Site-to-Site VPN | Advanced | 5–7 h |
| 7 | AI Ticket Handling | Intermediate | 3–4 h |
| 8 | cPanel Migration + DNS | Advanced | 6–8 h |
| 9 | AI Debugging (Shraga / Claude) | Advanced | 4–6 h |
| 10 | KVM Operations Lab | Advanced | 6–8 h |

Phase content (description, objectives, tasks, tips) is defined in `web/frontend/src/data/phases.js`.

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user; first user becomes admin |
| POST | `/api/auth/login` | — | Login (form-encoded); returns JWT + user object |
| GET | `/api/auth/me` | Bearer | Current user info |

### Progress (employee)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/progress/` | Bearer | Get all 10 phase records for current user |
| PUT | `/api/progress/{phase_id}` | Bearer | Update status (`not_started`/`in_progress`/`completed`) + notes |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users with progress summary |
| GET | `/api/admin/users/{id}` | Admin | Full progress breakdown for one user |
| PATCH | `/api/admin/users/{id}/role` | Admin | Change role (`employee`/`admin`) |
| DELETE | `/api/admin/users/{id}` | Admin | Delete user — **blocked if target is admin** |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/docs` | Interactive Swagger UI |

---

## Business Rules

- **First registered user** automatically becomes `admin`
- **Admin accounts cannot be deleted** — must be demoted to `employee` first (enforced in both backend and frontend)
- Admins cannot change their own role or delete themselves
- Phase progress timestamps: `started_at` is set on first `in_progress` transition; `completed_at` on `completed`

---

## User Roles

| Role | Can view dashboard | Can see admin panel | Can manage users |
|------|--------------------|---------------------|-----------------|
| employee | ✓ | ✗ | ✗ |
| admin | ✓ | ✓ | ✓ |

---

## Deployment

### One-command deploy (Alpine Linux)

```sh
cd /root/cloud-training/web
sh deploy.sh
```

What it does:
1. Installs `nginx`, `python3`, `nodejs`, `npm` via `apk`
2. `pip install -r backend/requirements.txt`
3. `npm install && npm run build` in `frontend/`
4. Copies `dist/` to `/var/www/cloud-training/`
5. Installs nginx config from `nginx.conf`
6. Creates OpenRC service `cloud-training-api` (uvicorn on `127.0.0.1:8000`)
7. Starts both services and adds them to the `default` runlevel

### Manual service control

```sh
rc-service cloud-training-api restart
rc-service nginx restart
tail -f /var/log/cloud-training-api.log
```

### Re-deploy after code changes

```sh
# Backend only
rc-service cloud-training-api restart

# Frontend only
cd /root/cloud-training/web/frontend
npm run build
cp -r dist/. /var/www/cloud-training/

# Both
cd /root/cloud-training/web/frontend && npm run build && cp -r dist/. /var/www/cloud-training/ && rc-service cloud-training-api restart
```

---

## Local Development

```sh
# Terminal 1 — backend
cd web/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd web/frontend
npm install
npm run dev       # Vite dev server on :5173, proxies /api → :8000
```

---

## Git & GitHub

- Remote: https://github.com/BarMinz/Cloud-Training.git
- Branch: `master`
- `.gitignore` excludes: `node_modules/`, `dist/`, `*.db`, `__pycache__/`, logs

```sh
# Push changes
cd /root/cloud-training
git add <files>
git commit -m "message"
git push origin master
```

---

## Known Bugs Fixed

| Bug | Root cause | Fix |
|-----|-----------|-----|
| All authenticated endpoints returned 401 | `python-jose` requires JWT `sub` to be a string; we were passing `user.id` (int) | Cast to `str()` on encode, `int()` on decode |
| Password hashing failed on startup | `passlib` bcrypt backend incompatible with installed `bcrypt` version on Alpine | Replaced `passlib` with direct `bcrypt` calls |

---

## Existing Accounts

| Username | Role | Email |
|----------|------|-------|
| bar | admin | barminz1209@gmail.com |
| ofir | employee | ofirl@kamatera.com |

---

## Phases Editor (shipped 2026-06-30)

**Trigger**: admin user edits a training phase via the website.

### Data model
- `phases` table (SQLite, 10 rows seeded from `frontend/src/data/phases.js` via `backend/seed_data/phases.json`). Columns: `id, title, subtitle, icon, color, accent, difficulty, estimated_time, description, objectives (json text), tasks (json text), tips (json text), updated_at`.
- `phase_revisions` table: `id, phase_id, snapshot (full json), author_id, author_username, created_at`. Capped at last 20 per phase.

### Backend routes — `backend/routers/phases.py`
- `GET /api/phases/` — public, list all
- `GET /api/phases/{id}` — public, single phase
- `PUT /api/phases/{id}` — admin only, edits + auto-snapshots
- `POST /api/phases/{id}/upload` — admin, multipart image upload (png/jpg/jpeg/webp/gif, 10 MB max) → `/var/www/cloud-training/uploads/phases/{id}/{uuid}.{ext}`. Nginx `client_max_body_size 12M;` enabled.
- `DELETE /api/phases/{id}/uploads/{filename}` — admin, path-traversal-guarded
- `GET /api/phases/{id}/revisions` — admin
- `GET /api/phases/{id}/revisions/{rev_id}` — admin
- `POST /api/phases/{id}/revisions/{rev_id}/revert` — admin (snapshots current state first)

### Frontend
- `src/contexts/PhasesContext.jsx` — `PhasesProvider` (in `App.jsx > ProtectedLayout`) + `usePhases()` hook = `{ phases, loading, refresh }`. All four consumers — `Dashboard.jsx`, `Profile.jsx`, `Admin.jsx`, `PhaseDetail.jsx` — fetch via the hook (no more static `PHASES` import). `phases.js` is kept only as the seed source + still exports `DIFFICULTY_COLORS` / `STATUS_META`.
- `src/components/PhaseEditor.jsx` — full edit form. Fields: title, subtitle, Markdown description with image upload (GFM via `react-markdown` + `remark-gfm`), Appearance card (icon emoji picker w/ 20 common picks, difficulty dropdown, estimated time, 10-preset color palette, accent hex picker w/ native `<input type="color">`), three list editors (objectives/tasks/tips) with add/remove/reorder. Bottom sticky toolbar: History (left), Cancel + Save (right). Revisions drawer slides in from the right.
- `src/pages/PhaseDetail.jsx` — admins see **Edit phase** button on the right of "Back to Dashboard"; admins also bypass `isLocked`. Read view renders `phase.description` through `<ReactMarkdown remarkPlugins={[remarkGfm]}>` inside `.md-preview` styled container.
- `src/pages/Dashboard.jsx` — `isLocked()` short-circuits to `false` for admin/main_admin.
- `.md-preview` CSS class in `src/index.css` styles the rendered Markdown (dark + light theme).
- Tailwind gradient classes for the 10 color presets are listed verbatim in `PhaseEditor.jsx` so Tailwind picks them up at build time.

### Image lifecycle
- Upload inserts `![](/uploads/phases/{id}/<uuid>.<ext>)` at cursor.
- On Save, `extractImageUrls()` diffs old vs new description; removed URLs trigger `DELETE /api/phases/{id}/uploads/<filename>` so the disk doesn't leak.

### Common pitfalls
- New gradient classes must be added BOTH to `COLOR_PRESETS` in `PhaseEditor.jsx` AND used somewhere Tailwind can scan. Adding a gradient string only in DB content will leave the class missing from the CSS bundle.
- Editing the inject channel: file size of `PhaseEditor.jsx` now ~17 KB. Use multi-chunk `cat >>` writes; small surgical edits via `python3 - <<'PYEOF'` heredoc + `str.replace`. Heredoc cap ~2 KB.
- Python heredoc inside bash: do NOT use Python `text("""...""")` inside an outer Python `"""..."""` block — escape or use single-quote triple-strings, otherwise `IndentationError` at runtime.
- Build + deploy cycle unchanged: `npm run build && rm -rf /var/www/cloud-training/assets && cp -a dist/. /var/www/cloud-training/`. Backend restart: `rc-service cloud-training-api restart`.

### Backups (safe to clean once stable)
- `*.bak.phases` — pre-DB-migration (`models.py`, `database.py`, `main.py`, `PhaseDetail.jsx`, `Dashboard.jsx`, `Profile.jsx`, `Admin.jsx`, `App.jsx`)
- `PhaseEditor.jsx.bak.md`, `.bak.theme`, `.bak.history` — incremental editor checkpoints
- `cloud-training.conf.bak.uploads` — pre-nginx-upload-size
