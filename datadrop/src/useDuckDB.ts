import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useRef, useState } from "react";

export interface LoadedTable {
  name: string;
  fileName: string;
  rowCount: number;
  columns: string[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

export interface DuckDBState {
  ready: boolean;
  initError: string | null;
  tables: LoadedTable[];
  result: QueryResult | null;
  queryError: string | null;
  isQuerying: boolean;
  loadCSV: (file: File) => Promise<void>;
  runQuery: (sql: string) => Promise<void>;
}

export function useDuckDB(): DuckDBState {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [tables, setTables] = useState<LoadedTable[]>([]);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const dbRef = useRef<AsyncDuckDB | null>(null);
  const connRef = useRef<AsyncDuckDBConnection | null>(null);
}
