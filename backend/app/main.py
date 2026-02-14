from fastapi import FastAPI
# from backend.app.routes.approval import router as approval_router
from .routes.approval import approval_router

app = FastAPI(title="Campus Pulse")


app.include_router(approval_router)
