export interface RunResult {
  result: string | null;
  stdout: string;
  error: string | null;
}

let _worker: Worker | null = null;
let _interruptBuffer: Uint8Array | null = null;
let _requestId = 0;
const _pending = new Map<
  number,
  { resolve: (r: RunResult) => void; reject: (e: Error) => void }
>();

type PyodideStatus = 'loading' | 'ready' | 'error';
type StatusCallback = (status: PyodideStatus) => void;

let _statusCallback: StatusCallback | null = null;
let _currentStatus: PyodideStatus = 'loading';

function getWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    new URL("../workers/pyodide.worker.ts", import.meta.url)
  );

  _worker.onmessage = (event) => {
    const msg = event.data;
    if (msg.type === 'ready') {
      _currentStatus = 'ready';
      _statusCallback?.('ready');
    } else if (msg.type === "result") {
      const pending = _pending.get(msg.id);
      if (pending) {
        _pending.delete(msg.id);
        pending.resolve({
          result: msg.result ?? null,
          stdout: msg.stdout ?? "",
          error: msg.error ?? null,
        });
      }
    }
  };

  _worker.onerror = (err) => {
    _currentStatus = 'error';
    _statusCallback?.('error');
    for (const [id, { reject }] of _pending) {
      _pending.delete(id);
      reject(new Error(err.message));
    }
  };

  if (typeof SharedArrayBuffer !== "undefined") {
    _interruptBuffer = new Uint8Array(new SharedArrayBuffer(1));
    _worker.postMessage({
      type: "setInterruptBuffer",
      buffer: _interruptBuffer,
    });
  }

  return _worker;
}

export function initializePyodide(onStatusChange: StatusCallback): void {
  _statusCallback = onStatusChange;
  // Trigger worker creation which starts Pyodide loading
  getWorker();
}

export function retryInitialization(onStatusChange: StatusCallback): void {
  terminateWorker();
  _worker = null;
  _currentStatus = 'loading';
  initializePyodide(onStatusChange);
}

export function getPyodideStatus(): PyodideStatus {
  return _currentStatus;
}

export async function runPython(
  code: string,
  timeoutMs = 10_000
): Promise<RunResult> {
  const worker = getWorker();
  const id = ++_requestId;

  const resultPromise = new Promise<RunResult>((resolve, reject) => {
    _pending.set(id, { resolve, reject });
  });

  let gracefulTimer: ReturnType<typeof setTimeout> | null = null;
  let hardTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (gracefulTimer) clearTimeout(gracefulTimer);
    if (hardTimer) clearTimeout(hardTimer);
  }

  function hardKill() {
    if (_worker) {
      _worker.terminate();
      _worker = null;
    }
    const pending = _pending.get(id);
    if (pending) {
      _pending.delete(id);
      pending.resolve({
        result: null,
        stdout: "",
        error: `TimeoutError: execution exceeded ${timeoutMs}ms`,
      });
    }
  }

  gracefulTimer = setTimeout(() => {
    if (_interruptBuffer) {
      _interruptBuffer[0] = 2;
      hardTimer = setTimeout(hardKill, 1_000);
    } else {
      hardKill();
    }
  }, timeoutMs);

  worker.postMessage({ type: "run", id, code });

  try {
    const result = await resultPromise;
    clearTimers();
    if (_interruptBuffer) _interruptBuffer[0] = 0;
    return result;
  } catch (err) {
    clearTimers();
    throw err;
  }
}

export function terminateWorker() {
  if (_worker) {
    _worker.terminate();
    _worker = null;
  }
  _pending.clear();
}
