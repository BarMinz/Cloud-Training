from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from database import engine, run_migrations
import models
from routers import auth, progress, admin, analytics, containers, chat, phases

models.Base.metadata.create_all(bind=engine)
run_migrations(engine)

app = FastAPI(
    title="Cloud Training API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["79.108.163.7", "cloud-training.online", "localhost", "127.0.0.1"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cloud-training.online", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(containers.router)
app.include_router(chat.router)
app.include_router(phases.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
