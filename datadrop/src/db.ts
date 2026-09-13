import * as duckdb from "@duckdb/duckdb-wasm";

type Row = Record<string, unknown>;

type ArrowTableLike = {
  schema: {
    fields: Array<{ name: string }>;
  };
  numRows: number;
  getChild: (name: string) => { get: (index: number) => unknown } | null;
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      if (!bundle.mainWorker) throw new Error("DuckDB bundle does not contain a main worker.");

      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: "text/javascript",
        }),
      );
      const worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      return db;
    })();
  }
  return dbPromise;
}

export function arrowToRows(table: ArrowTableLike): Row[] {
  const rows: Row[] = [];
  const fields = table.schema.fields;
  for (let i = 0; i < table.numRows; i++) {
    const row: Row = {};
    for (const field of fields) {
      const val: unknown = table.getChild(field.name)?.get(i) ?? null;
      row[field.name] = typeof val === "bigint" ? Number(val) : val;
    }
    rows.push(row);
  }
  return rows;
}
