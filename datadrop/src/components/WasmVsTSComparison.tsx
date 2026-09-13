import { useCallback, useEffect, useMemo, useState } from "react";
import { fib as fibTs } from "../fibonacci";

type FibFn = (n: number) => number;

type BenchmarkRow = {
  n: number;
  iterations: number;
  tsOutput: number;
  wasmOutput: number;
  outputMatch: boolean;
  tsMs: number;
  wasmMs: number;
  speedup: number;
};

// Fibonacci test inputs
const TEST_INPUTS = [10, 20, 30, 35, 40];

const formatMs = (value: number) => `${value.toFixed(3)} ms`;

const formatSpeedup = (value: number) => `${value.toFixed(2)}x`;

async function loadWasmFib(): Promise<FibFn> {
  let wasmInstance: WebAssembly.Instance;

  if ("instantiateStreaming" in WebAssembly) {
    try {
      const response = await fetch("/fibonacci_as.wasm");
      const result = await WebAssembly.instantiateStreaming(response);
      wasmInstance = result.instance;
    } catch {
      const response = await fetch("/fibonacci_as.wasm");
      const wasmBytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(wasmBytes);
      wasmInstance = result.instance;
    }
  } else {
    const response = await fetch("/fibonacci_as.wasm");
    const wasmBytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(wasmBytes);
    wasmInstance = result.instance;
  }

  const fib = (wasmInstance.exports as { fib?: FibFn }).fib;

  if (typeof fib !== "function") {
    throw new Error("WASM module does not export a `fib` function.");
  }

  return fib;
}

function runBenchmark(
  fn: FibFn,
  n: number,
  iterations: number,
): { output: number; durationMs: number } {
  fn(n);

  const start = performance.now();
  let output = 0;
  for (let i = 0; i < iterations; i += 1) {
    output = fn(n);
  }
  const durationMs = performance.now() - start;

  return { output, durationMs };
}

function iterationsForInput(n: number): number {
  return Math.max(10_000, Math.floor(450_000 / n));
}

export function WasmVsTSComparison() {
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runComparison = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    try {
      const fibWasm = await loadWasmFib();
      setIsWasmReady(true);

      const nextRows = TEST_INPUTS.map((n) => {
        const iterations = iterationsForInput(n);
        const ts = runBenchmark(fibTs, n, iterations);
        const wasm = runBenchmark(fibWasm, n, iterations);
        const speedup = wasm.durationMs > 0 ? ts.durationMs / wasm.durationMs : 0;

        return {
          n,
          iterations,
          tsOutput: ts.output,
          wasmOutput: wasm.output,
          outputMatch: ts.output === wasm.output,
          tsMs: ts.durationMs,
          wasmMs: wasm.durationMs,
          speedup,
        };
      });

      setRows(nextRows);
      setRunCount((count) => count + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setIsWasmReady(false);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    void runComparison();
  }, [runComparison]);

  const summary = useMemo(() => {
    if (rows.length === 0) {
      return null;
    }

    const totalTs = rows.reduce((sum, row) => sum + row.tsMs, 0);
    const totalWasm = rows.reduce((sum, row) => sum + row.wasmMs, 0);
    const allMatch = rows.every((row) => row.outputMatch);
    const aggregateSpeedup = totalWasm > 0 ? totalTs / totalWasm : 0;

    return {
      totalTs,
      totalWasm,
      allMatch,
      aggregateSpeedup,
    };
  }, [rows]);

  return (
    <section className="wasm-card">
      <div className="wasm-head">
        <div>
          <h3 className="wasm-title">AssemblyScript WASM vs TypeScript Fibonacci</h3>
          <p className="wasm-copy">
            Benchmarks compare output parity and execution time for repeated Fibonacci calls.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void runComparison()}
          disabled={isRunning}
        >
          {isRunning ? "Running…" : "Re-run Benchmark"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {summary ? (
        <div className="wasm-results">
          <div className="wasm-meta">
            <span>WASM status: {isWasmReady ? "ready" : "not ready"}</span>
            <span>Runs: {runCount}</span>
            <span>Output parity: {summary.allMatch ? "match" : "mismatch"}</span>
            <span>Total TS: {formatMs(summary.totalTs)}</span>
            <span>Total WASM: {formatMs(summary.totalWasm)}</span>
            <span>Aggregate speedup: {formatSpeedup(summary.aggregateSpeedup)}</span>
          </div>

          <table className="wasm-table">
            <thead>
              <tr>
                <th scope="col">n</th>
                <th scope="col">iterations</th>
                <th scope="col">TS output</th>
                <th scope="col">WASM output</th>
                <th scope="col">match</th>
                <th scope="col">TS time</th>
                <th scope="col">WASM time</th>
                <th scope="col">TS/WASM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.n}>
                  <td>{row.n}</td>
                  <td>{row.iterations.toLocaleString()}</td>
                  <td>{row.tsOutput.toLocaleString()}</td>
                  <td>{row.wasmOutput.toLocaleString()}</td>
                  <td>{row.outputMatch ? "yes" : "no"}</td>
                  <td>{formatMs(row.tsMs)}</td>
                  <td>{formatMs(row.wasmMs)}</td>
                  <td>{formatSpeedup(row.speedup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="wasm-empty">Running benchmark…</div>
      )}
    </section>
  );
}
