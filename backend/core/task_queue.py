import asyncio
from typing import Callable, Any
from utils.logger import logger

class TaskQueue:
    def __init__(self, max_concurrent: int = 5):
        self.queue = asyncio.Queue()
        self.max_concurrent = max_concurrent
        self.workers = []

    async def start(self):
        for _ in range(self.max_concurrent):
            worker = asyncio.create_task(self._worker())
            self.workers.append(worker)

    async def _worker(self):
        while True:
            task_func, args, kwargs = await self.queue.get()
            try:
                await task_func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Task failed: {e}")
            finally:
                self.queue.task_done()

    async def enqueue(self, task_func: Callable, *args, **kwargs):
        await self.queue.put((task_func, args, kwargs))

task_queue = TaskQueue()
