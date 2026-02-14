from fastapi import FastAPI
from app.routes import router as approval_router

app = FastAPI(title="Campus Pulse")


app.include_router(approval_router)
