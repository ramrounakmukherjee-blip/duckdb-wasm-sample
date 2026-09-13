import { useState } from "react";
import { ChartView } from "./components/ChartView";
import { DataTable } from "./components/DataTable";
import { Dropzone } from "./components/Dropzone";
import { QueryEditor } from "./components/QueryEditor";
import { TableList } from "./components/TableList";

function App() {
  const [sql, setSql] = useState<string>("");
  const [activeView, setActiveView] = useState<"table" | "chart">("table");

  return (
    <div>
      <div className="layout">
        <header className="header">
          <div className="header-brand">
            <span className="header-logo">◆</span>
            <span className="header-title">DataDrop</span>
          </div>
          <span className="header-tagline">In-browser SQL analytics - powered by DuckDB-WASM</span>
        </header>

        <main className="content">
          {/* // TODO: Implement loadCSV function and manage DuckDB readiness state */}
          <Dropzone onFile={(files) => console.log(files)} />

          {/* // TODO: Replace empty tables array with actual loaded tables from DuckDB hook */}
          <TableList
            tables={[]}
            onSelect={(name) => setSql(`SELECT *\nFROM "${name}"\nLIMIT 10`)}
          />

          {/* // TODO: Implement query execution and manage query state */}
          <QueryEditor
            sql={sql}
            onChange={setSql}
            onRun={() => console.log("Run query")}
            isRunning={false}
            disabled={false}
          />

          <section className="results">
            <div className="results-header">
              <span className="results-meta">{/* TODO: Display query metadata */}</span>
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
              // TODO: Display query results using the DataTable component
              <DataTable columns={[]} rows={[]} />
            ) : (
              // TODO: Display query results using the ChartView component
              <ChartView columns={[]} rows={[]} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
