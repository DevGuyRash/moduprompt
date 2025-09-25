import { compileDocument } from './compiler.js';
import type {
  RegisterWorkerOptions,
  WorkerClientOptions,
  WorkerCompileFailure,
  WorkerCompilePayload,
  WorkerCompileRequest,
  WorkerCompileSuccess,
  WorkerLike,
  WorkerMessageEvent,
} from './types.js';

let requestCounter = 0;

const DISALLOWED_NETWORK_MESSAGE = 'Network APIs are disabled inside ModuPrompt compiler workers.';

const createRequestId = (): string => {
  const id = `compile-${requestCounter}`;
  requestCounter += 1;
  return id;
};

const disableNetworkApi = (scope: Record<string, unknown>, key: string): void => {
  if (!(key in scope)) {
    return;
  }
  const blockerTarget = function (): never {
    throw new Error(DISALLOWED_NETWORK_MESSAGE);
  };
  const blocker = new Proxy(blockerTarget, {
    apply() {
      throw new Error(DISALLOWED_NETWORK_MESSAGE);
    },
    construct() {
      throw new Error(DISALLOWED_NETWORK_MESSAGE);
    },
  });

  try {
    Object.defineProperty(scope, key, {
      configurable: false,
      enumerable: false,
      value: blocker,
      writable: false,
    });
  } catch {
    (scope as unknown as Record<string, unknown>)[key] = blocker;
  }
};

const enforceSandbox = (scope: RegisterWorkerOptions['scope']): void => {
  if (!scope) {
    return;
  }
  const sandboxScope = scope as unknown as Record<string, unknown>;
  disableNetworkApi(sandboxScope, 'fetch');
  disableNetworkApi(sandboxScope, 'XMLHttpRequest');
  disableNetworkApi(sandboxScope, 'WebSocket');
  const maybeNavigator = sandboxScope.navigator;
  if (maybeNavigator && typeof maybeNavigator === 'object') {
    disableNetworkApi(maybeNavigator as Record<string, unknown>, 'sendBeacon');
  }
};

export const registerCompilerWorker = (options?: RegisterWorkerOptions): void => {
  const scope = options?.scope ?? ((globalThis as unknown) as RegisterWorkerOptions['scope']);
  if (!scope) {
    throw new Error('Compiler worker scope is not available.');
  }
  enforceSandbox(scope);
  const handler = (event: WorkerMessageEvent<WorkerCompileRequest>): void => {
    const message = event.data;
    if (!message || message.type !== 'compile') {
      return;
    }
    try {
      const result = compileDocument({
        ...message.payload,
        formatters: options?.formatters,
        filters: options?.filters,
      });
      const response: WorkerCompileSuccess = {
        type: 'result',
        id: message.id,
        result,
      };
      scope.postMessage(response);
    } catch (error) {
      const response: WorkerCompileFailure = {
        type: 'error',
        id: message.id,
        error: {
          message: error instanceof Error ? error.message : 'Unknown compiler error',
        },
      };
      scope.postMessage(response);
    }
  };
  scope.addEventListener('message', handler);
};

export const compileWithWorker = (
  worker: WorkerLike,
  payload: WorkerCompilePayload,
  options?: WorkerClientOptions,
): Promise<WorkerCompileSuccess['result']> => {
  const id = createRequestId();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleMessage = (event: WorkerMessageEvent<WorkerCompileSuccess | WorkerCompileFailure>): void => {
      const message = event.data;
      if (!message || message.id !== id) {
        return;
      }
      if (timer) {
        clearTimeout(timer);
      }
      worker.removeEventListener('message', handleMessage);
      if (message.type === 'result') {
        resolve(message.result);
      } else {
        reject(new Error(message.error.message));
      }
    };

    worker.addEventListener('message', handleMessage);

    if (options?.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        worker.removeEventListener('message', handleMessage);
        reject(new Error('Compiler worker timed out.'));
      }, options.timeoutMs);
    }

    const request: WorkerCompileRequest = {
      type: 'compile',
      id,
      payload,
    };
    worker.postMessage(request);
  });
};
