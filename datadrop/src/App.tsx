import { useState } from "react";
import { ChartView } from "./components/ChartView";
import { DataTable } from "./components/DataTable";
import { Dropzone } from "./components/Dropzone";
import { QueryEditor } from "./components/QueryEditor";
import { TableList } from "./components/TableList";
import { useDuckDB } from "./useDuckDB";

function App() {
  const { ready, initError, tables, result, queryError, isQuerying, loadCSV, runQuery } =
    useDuckDB();

  const [sql, setSql] = useState<string>("");
  const [activeView, setActiveView] = useState<"table" | "chart">("table");

  if (initError) {
    return (
      <div className="init-error">
        <h2>Failed to initialise DuckDB</h2>
        <pre>{initError}</pre>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <span className="header-logo">◆</span>
          <span className="header-title">DataDrop</span>
        </div>
        <span className="header-tagline">In-browser SQL analytics - powered by DuckDB-WASM</span>
        {!ready && <span className="header-status">Loading DuckDB...</span>}
      </header>

      <main className="content">
        <Dropzone onFile={loadCSV} disabled={!ready} />

        {tables.length > 0 && (
          <TableList
            tables={tables}
            onSelect={(name) => setSql(`SELECT *\nFROM "${name}"\nLIMIT 10;`)}
          />
        )}

        <QueryEditor
          sql={sql}
          onChange={setSql}
          onRun={() => runQuery(sql)}
          isRunning={isQuerying}
          disabled={!ready}
        />

        {queryError && <div className="error-banner">{queryError}</div>}

        {result && (
          <section className="results">
            <div className="results-header">
              <span className="results-meta">
                {result.rowCount.toLocaleString()} row
                {result.rowCount !== 1 ? "s" : ""} - {result.durationMs} ms
              </span>
              <div className="results-tabs">
                <button
                  type="button"
                  className={`tab${activeView === "table" ? " tab--active" : ""}`}
                  onClick={() => setActiveView("table")}
                >
                  Table
                </button>

                <button
                  type="button"
                  className={`tab${activeView === "chart" ? " tab--active" : ""}`}
                  onClick={() => setActiveView("chart")}
                >
                  Chart
                </button>
              </div>
            </div>

            {activeView === "table" ? (
              <DataTable columns={result.columns} rows={result.rows} />
            ) : (
              <ChartView columns={result.columns} rows={result.rows} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
