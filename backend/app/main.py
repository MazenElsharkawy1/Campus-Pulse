from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Campus Pulse Backend is running!"}  # اختبار بسيط
