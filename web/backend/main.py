from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from database import engine, run_migrations
import models
from routers import auth, progress, admin, analytics, containers

models.Base.metadata.create_all(bind=engine)
run_migrations(engine)

app = FastAPI(title="Cloud Training API", docs_url=None, redoc_url=None)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["79.108.163.7", "localhost", "127.0.0.1"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://79.108.163.7", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(containers.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
