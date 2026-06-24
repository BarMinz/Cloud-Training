## Project: Cloud Training Program
A 10-phase hands-on training program for new employees covering Linux, Windows, networking, and AI-assisted workflows. Accessed entirely through a web interface from each employee's computer.

## Server
- OS: Alpine Linux (BusyBox-based)
- IP: 79.108.163.7
- Hosted on CWM (Cloud With Me)

## Web Interface Stack
- Frontend: React + Vite + Tailwind CSS (built to static files, served by nginx)
- Backend: FastAPI + SQLite (Python, lightweight REST API)
- Web server: nginx (reverse proxy — /api/* → FastAPI, /* → static frontend)
- Auth: JWT tokens
- Roles: employee, admin

## Project Layout
```
web/
  frontend/    # React app (npm run build → dist/)
  backend/     # FastAPI app (uvicorn main:app)
  nginx.conf   # nginx site config
  deploy.sh    # One-command deploy script
```

## Training Phases
1. Ticket Simulation — solve support tickets; evaluate troubleshooting logic and prioritization
2. LAMP Project — build cloud-hosted LAMP stack; validate deployment skills
3. Troubleshooting Lab (Advanced) — repair a broken LAMP env; GPT allowed, no Shraga
4. Firewall Lab — place LAMP behind firewall, configure NAT and port forwarding
5. Windows Infrastructure — Active Directory, RDP, FTP, IIS
6. Site-to-Site VPN — second firewall + VPN between sites
7. AI Ticket Handling — simulated customer conversations and AI-generated tickets
8. cPanel Migration + DNS — CentOS 7 to AlmaLinux migration + DNS update
9. AI Debugging (Shraga / Claude) — use AI tools to investigate and solve technical problems
10. KVM Operations Lab — VirtIO, migrations, restores, recovery scenarios
