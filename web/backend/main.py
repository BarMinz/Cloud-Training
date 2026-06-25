from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, run_migrations
import models
from routers import auth, progress, admin, analytics, containers

models.Base.metadata.create_all(bind=engine)
run_migrations(engine)

app = FastAPI(title="Cloud Training API", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
