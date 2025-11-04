/**
 * 并发限制器
 * 用于限制同时执行的异步任务数量
 */
export class ConcurrencyLimiter {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;

  constructor(private maxConcurrency: number) {}

  /**
   * 执行任务,如果超过并发限制则排队
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrency) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
    }
  }

  /**
   * 获取当前运行中的任务数
   */
  getRunningCount(): number {
    return this.running;
  }

  /**
   * 批量执行任务,控制并发数量
   */
  async runBatch<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];

    for (const task of tasks) {
      const result = await this.run(task);
      results.push(result);
    }

    return results;
  }
}
