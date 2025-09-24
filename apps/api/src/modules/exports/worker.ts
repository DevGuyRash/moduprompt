import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import type { CompileOptions, PdfRenderer } from '@moduprompt/compiler';
import { buildArtifact, compileDocument } from '@moduprompt/compiler';
import type { DocumentModel } from '@moduprompt/types';
import type { Env } from '../../config/env.js';
import type { ExportQueueProcessorContext } from './queue.js';
import type { ExportStorage } from './storage.js';
import type { ExportRepository } from './repository.js';
import type { DomainEventDispatcher } from '../../events/dispatcher.js';
import pino from 'pino';

const truncate = (value: string, max = 500): string => (value.length > max ? `${value.slice(0, max)}…` : value);

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return truncate(error.message.replace(/\s+/g, ' ').trim() || error.name);
  }
  if (typeof error === 'string') {
    return truncate(error.replace(/\s+/g, ' ').trim());
  }
  return 'Unknown export error';
};

const collectSnippetIds = (document: DocumentModel): string[] => {
  const ids = new Set<string>();
  for (const block of document.blocks) {
    if (block.kind === 'snippet' && block.snippetId) {
      ids.add(block.snippetId);
    }
  }
  return Array.from(ids);
};

interface ExportWorkerDependencies {
  repository: ExportRepository;
  storage: ExportStorage;
  env: Env;
  events: DomainEventDispatcher;
  pdfRenderer?: PdfRenderer;
}

export class ExportWorker {
  private readonly logger = pino({ name: 'export-worker' });

  constructor(private readonly deps: ExportWorkerDependencies) {}

  async process(jobId: string, context: ExportQueueProcessorContext): Promise<void> {
    const startedAt = performance.now();
    const jobContext = await this.deps.repository.getJobContext(jobId);
    if (!jobContext) {
      this.logger.warn({ jobId }, 'export job context missing; skipping');
      return;
    }

    if (jobContext.job.status === 'completed') {
      this.logger.info({ jobId }, 'export job already completed; skipping');
      return;
    }

    await this.deps.repository.markProcessing(jobId, {
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      startedAt: new Date().toISOString(),
    });

    try {
      const snippetIds = collectSnippetIds(jobContext.document);
      const bundles = await this.deps.repository.getSnippetBundles(snippetIds);

      const compileOptions: CompileOptions = {
        document: jobContext.document,
        snippets: bundles,
        allowedStatuses: jobContext.recipe.allowedStatuses,
        includeComments: false,
      } satisfies CompileOptions;

      const compileResult = compileDocument(compileOptions);

      if (compileResult.preflight.summary.errors > 0) {
        const errorMessage = compileResult.preflight.issues
          .filter((issue) => issue.severity === 'error')
          .map((issue) => issue.message)
          .join('; ');
        await this.deps.repository.markFailed(jobId, {
          error: `Preflight blocked export: ${truncate(errorMessage)}`,
          metadata: {
            attempt: context.attempt,
            maxAttempts: context.maxAttempts,
            diagnostics: compileResult.diagnostics,
            preflight: compileResult.preflight,
          },
        });
        await this.deps.events.dispatch({
          id: randomUUID(),
          type: 'export.failed',
          occurredAt: new Date().toISOString(),
          actorId: 'export-worker',
          exportJobId: jobId,
          documentId: jobContext.document.id,
          recipe: jobContext.recipe,
          error: `Preflight blocked export: ${truncate(errorMessage)}`,
        });
        return;
      }

      const artifact = await buildArtifact({
        document: jobContext.document,
        recipe: jobContext.recipe,
        result: compileResult,
        pdfRenderer: jobContext.recipe.type === 'pdf' ? this.deps.pdfRenderer : undefined,
        pdfOptions: {
          timeoutMs: context.timeoutMs,
          signal: context.signal,
          pdf: jobContext.recipe.pdf,
        },
      });

      const key = this.buildStorageKey(jobContext.document.id, jobContext.recipe.id, artifact.metadata.artifactHash, artifact.extension);
      const stored = await this.deps.storage.put({
        key,
        body: artifact.body,
        contentType: artifact.contentType,
        metadata: {
          ...artifact.metadata,
          jobId,
          recipeId: jobContext.recipe.id,
        },
      });

      const durationMs = performance.now() - startedAt;
      const metadata = {
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        durationMs: Math.round(durationMs),
        storage: {
          uri: stored.uri,
          size: stored.size,
          etag: stored.etag,
        },
        artifact: {
          contentType: artifact.contentType,
          extension: artifact.extension,
          metadata: artifact.metadata,
        },
        diagnostics: compileResult.diagnostics,
        preflight: compileResult.preflight,
        provenance: compileResult.provenance,
        generatedAt: new Date().toISOString(),
      } satisfies Record<string, unknown>;

      await this.deps.repository.markCompleted(jobId, {
        artifactUri: stored.uri,
        metadata,
      });
      await this.deps.events.dispatch({
        id: randomUUID(),
        type: 'export.completed',
        occurredAt: new Date().toISOString(),
        actorId: 'export-worker',
        exportJobId: jobId,
        documentId: jobContext.document.id,
        recipe: jobContext.recipe,
        artifactUri: stored.uri,
      });
    } catch (error) {
      const finalAttempt = context.attempt >= context.maxAttempts;
      const message = sanitizeError(error);
      if (finalAttempt) {
        await this.deps.repository.markFailed(jobId, {
          error: message,
          metadata: {
            attempt: context.attempt,
            maxAttempts: context.maxAttempts,
            failedAt: new Date().toISOString(),
          },
        });
        await this.deps.events.dispatch({
          id: randomUUID(),
          type: 'export.failed',
          occurredAt: new Date().toISOString(),
          actorId: 'export-worker',
          exportJobId: jobId,
          documentId: jobContext.document.id,
          recipe: jobContext.recipe,
          error: message,
        });
      } else {
        await this.deps.repository.markQueued(jobId, {
          attempt: context.attempt + 1,
          maxAttempts: context.maxAttempts,
          lastError: message,
          requeuedAt: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  private buildStorageKey(documentId: string, recipeId: string, hash: string, extension: string): string {
    const prefix = this.deps.env.EXPORT_ARTIFACT_PREFIX.replace(/\/$/, '');
    return `${prefix}/${documentId}/${recipeId}/${hash}-${randomUUID()}.${extension}`;
  }
}
