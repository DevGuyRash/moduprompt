import {
  compileDocument,
  compileWithWorker,
  type CompileResult,
  type WorkerClientOptions,
  type WorkerCompilePayload,
} from '@moduprompt/compiler';

export interface CompilerWorkerBridgeOptions {
  timeoutMs?: number;
  workerFactory?: () => Worker;
}

const isWorkerSupported = typeof Worker !== 'undefined';

const createDefaultWorker = (): Worker =>
  new Worker(new URL('../../workers/compiler.worker.ts', import.meta.url), { type: 'module' });

export class CompilerWorkerBridge {
  private worker: Worker | undefined;
  private disposed = false;

  constructor(private readonly options: CompilerWorkerBridgeOptions = {}) {
    if (isWorkerSupported) {
      this.worker = (options.workerFactory ?? createDefaultWorker)();
    }
  }

  async compile(payload: WorkerCompilePayload, clientOptions?: WorkerClientOptions): Promise<CompileResult> {
    if (this.disposed) {
      throw new Error('Compiler worker bridge has been disposed.');
    }

    const timeoutMs = clientOptions?.timeoutMs ?? this.options.timeoutMs;

    if (!isWorkerSupported || !this.worker) {
      return compileDocument({
        document: payload.document,
        snippets: payload.snippets,
        variables: payload.variables,
        allowedStatuses: payload.allowedStatuses,
        includeComments: payload.includeComments,
        newline: payload.newline,
      });
    }

    return compileWithWorker(this.worker, payload, { timeoutMs });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }
}
