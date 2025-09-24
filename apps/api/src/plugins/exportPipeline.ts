import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ExportQueue } from '../modules/exports/queue.js';
import { ExportWorker } from '../modules/exports/worker.js';
import { createExportStorage } from '../modules/exports/storage.js';
import { createPdfRenderer } from '../modules/exports/pdfRenderer.js';
import { ExportRepository } from '../modules/exports/repository.js';

declare module 'fastify' {
  interface FastifyInstance {
    exportQueue: ExportQueue;
    exportWorker: ExportWorker;
  }
}

export const exportPipelinePlugin = fp(async (app: FastifyInstance) => {
  const storage = createExportStorage(app.env);
  const repository = new ExportRepository(app.prisma);
  const pdfRenderer = createPdfRenderer(app.env);
  const worker = new ExportWorker({
    repository,
    storage,
    env: app.env,
    events: app.events,
    pdfRenderer,
  });
  const queue = new ExportQueue({
    concurrency: app.env.EXPORT_QUEUE_CONCURRENCY,
    retryLimit: app.env.EXPORT_QUEUE_RETRY_LIMIT,
    timeoutMs: app.env.EXPORT_JOB_TIMEOUT_MS,
    processor: (jobId, context) => worker.process(jobId, context),
    logger: app.log,
  });

  app.decorate('exportWorker', worker);
  app.decorate('exportQueue', queue);
});
