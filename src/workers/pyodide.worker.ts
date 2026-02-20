// Worker context — postMessage and onmessage are available globally
declare function importScripts(...urls: string[]): void;
declare function postMessage(message: unknown): void;

importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js");

interface PyodideInstance {
  setInterruptBuffer(buffer: ArrayBuffer): void;
  setStdout(options: { raw: (charCode: number) => void }): void;
  setStderr(options: { raw: (charCode: number) => void }): void;
  loadPackagesFromImports(code: string): Promise<void>;
  loadPackage(name: string): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
}

declare function loadPyodide(options?: { indexURL?: string }): Promise<PyodideInstance>;

let pyodideReady: Promise<PyodideInstance> | null = null;
let isInitialized = false;

function getPyodide(): Promise<PyodideInstance> {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/",
    }).then(async (pyodide) => {
      // Preload numpy for warmup
      await pyodide.loadPackage("numpy");
      if (!isInitialized) {
        isInitialized = true;
        postMessage({ type: "ready" });
      }
      return pyodide;
    });
  }
  return pyodideReady;
}

interface WorkerMessage {
  type: string;
  id: string;
  code: string;
  buffer?: ArrayBuffer;
}

onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, code } = event.data;

  if (type === "setInterruptBuffer") {
    const pyodide = await getPyodide();
    if (event.data.buffer) {
      pyodide.setInterruptBuffer(event.data.buffer);
    }
    return;
  }

  if (type === "run") {
    let stdoutBuffer = "";

    try {
      const pyodide = await getPyodide();

      pyodide.setStdout({
        raw: (charCode: number) => {
          stdoutBuffer += String.fromCharCode(charCode);
        },
      });
      pyodide.setStderr({
        raw: (charCode: number) => {
          stdoutBuffer += String.fromCharCode(charCode);
        },
      });

      await pyodide.loadPackagesFromImports(code);
      const result = await pyodide.runPythonAsync(code);

      postMessage({
        type: "result",
        id,
        result: result != null ? String(result) : null,
        stdout: stdoutBuffer,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      postMessage({
        type: "result",
        id,
        result: null,
        stdout: stdoutBuffer,
        error: message,
      });
    }
  }
};

// Trigger eager initialization when worker loads
getPyodide();
