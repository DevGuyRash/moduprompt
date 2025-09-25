import PQueue from 'p-queue';
import type { FastifyBaseLogger } from 'fastify';

export interface ExportQueueProcessorContext {
  attempt: number;
  maxAttempts: number;
  signal: AbortSignal;
  timeoutMs: number;
}

export type ExportQueueProcessor = (jobId: string, context: ExportQueueProcessorContext) => Promise<void>;

export type ExportQueueLogger = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;

export interface ExportQueueOptions {
  concurrency: number;
  retryLimit: number;
  timeoutMs: number;
  processor: ExportQueueProcessor;
  logger: ExportQueueLogger;
}

const backoffDelay = (attempt: number): number => {
  const base = 2 ** (attempt - 1) * 1000;
  return Math.min(base, 10000);
};

export class ExportQueue {
  private readonly queue: PQueue;

  constructor(private readonly options: ExportQueueOptions) {
    this.queue = new PQueue({ concurrency: options.concurrency });
  }

  enqueue(jobId: string): Promise<void> {
    const promise = this.queue.add(() => this.run(jobId));
    promise.catch((error) => {
      this.options.logger.error({ jobId, err: error }, 'export job processing permanently failed');
    });
    return promise;
  }

  private async run(jobId: string): Promise<void> {
    const maxAttempts = this.options.retryLimit + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        this.options.logger.info({ jobId, attempt }, 'export job processing start');
        await this.options.processor(jobId, {
          attempt,
          maxAttempts,
          signal: controller.signal,
          timeoutMs: this.options.timeoutMs,
        });
        this.options.logger.info({ jobId, attempt }, 'export job processing complete');
        return;
      } catch (error) {
        this.options.logger.error({ jobId, attempt, err: error }, 'export job processing attempt failed');
        const isLastAttempt = attempt >= maxAttempts;
        if (isLastAttempt) {
          throw error;
        }
        const delay = backoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
