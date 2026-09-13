import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useCallback, useEffect, useRef, useState } from "react";
import { arrowToRows, getDB } from "./db";

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

  useEffect(() => {
    let cancelled = false;

    getDB()
      .then(async (db) => {
        if (cancelled) return;
        dbRef.current = db;
        connRef.current = await db.connect();
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setInitError(String(err));
        }
      });

    return () => {
      cancelled = true;
      connRef.current?.close();
      connRef.current = null;
    };
  }, []);

  const loadCSV = useCallback(async (file: File) => {
    const db = dbRef.current;
    const conn = connRef.current;
    if (!db || !conn) {
      throw new Error("DuckDB is not initialized");
    }

    const tableName = file.name
      .replace(/\.csv$/i, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^([0-9])/, "_$1");

    const safeName = file.name.replace(/'/g, "''");

    setQueryError(null);

    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      await db.registerFileBuffer(safeName, buf);

      await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
      await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${safeName}')`);

      const countRows = arrowToRows(
        await conn.query(`SELECT COUNT(*) AS rowCount FROM "${tableName}"`),
      );
      const rowCount = Number(countRows[0]?.rowCount ?? 0);

      const schemaRows = arrowToRows(await conn.query(`DESCRIBE "${tableName}"`));
      const columns = schemaRows.map((row) => String(row.column_name));

      setTables((prev) => [
        ...prev.filter((t) => t.name !== tableName),
        { name: tableName, fileName: file.name, rowCount, columns },
      ]);
    } catch (err: unknown) {
      setQueryError(`Failed to load "${file.name}": ${String(err)}`);
    }
  }, []);

  const runQuery = useCallback(async (sql: string) => {
    const conn = connRef.current;
    if (!conn || !sql.trim()) {
      return;
    }

    setIsQuerying(true);
    setQueryError(null);

    const t0 = performance.now();

    try {
      const arrowTable = await conn.query(sql);
      const durationMs = Math.round(performance.now() - t0);
      const columns: string[] = arrowTable.schema.fields.map((field) => field.name);
      const rows = arrowToRows(arrowTable);
      setResult({ columns, rows, rowCount: rows.length, durationMs });
    } catch (err: unknown) {
      setQueryError(String(err));
      setResult(null);
    } finally {
      setIsQuerying(false);
    }
  }, []);

  return {
    ready,
    initError,
    tables,
    result,
    queryError,
    isQuerying,
    loadCSV,
    runQuery,
  };
}
