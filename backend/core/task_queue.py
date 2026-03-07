import asyncio

class TaskQueue:
    def __init__(self, max_concurrent: int = 3):
        self.queue = asyncio.Queue()
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.workers = []

    async def enqueue(self, task_func, *args, **kwargs):
        await self.queue.put((task_func, args, kwargs))

    async def worker(self):
        while True:
            task_func, args, kwargs = await self.queue.get()
            async with self.semaphore:
                try:
                    await task_func(*args, **kwargs)
                except Exception as e:
                    print(f"Task failed: {e}")
                finally:
                    self.queue.task_done()

    def start_workers(self, num_workers: int = 3):
        for _ in range(num_workers):
            task = asyncio.create_task(self.worker())
            self.workers.append(task)

task_queue = TaskQueue()
