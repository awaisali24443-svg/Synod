from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import scan_router, auth_router, system_router
from core.task_queue import task_queue
import asyncio

app = FastAPI(title="SYNOD Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(system_router.router)
app.include_router(scan_router.router)
app.include_router(auth_router.router)

@app.on_event("startup")
async def startup_event():
    # Initialize background task queues
    await task_queue.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
