from fastapi import FastAPI
# from backend.app.routes.approval import router as approval_router
from .routes.approval import router 

app = FastAPI(title="Campus Pulse")


app.include_router(router)
