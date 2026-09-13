import type { LoadedTable } from "../useDuckDB";

interface Props {
  tables: LoadedTable[];
  onSelect: (name: string) => void;
}

export function TableList({ tables, onSelect }: Props) {
  return (
    <div className="table-list">
      <span className="table-list-label">Tables</span>
      {tables.map((table) => (
        <button
          key={table.name}
          type="button"
          className="table-chip"
          onClick={() => onSelect(table.name)}
          title={`${table.columns?.join(", ")}`}
        >
          <span className="table-chip-name">{table.name}</span>
          <span className="table-chip-meta">
            {table.rowCount.toLocaleString()} rows. {table.columns.length}
            cols
          </span>
        </button>
      ))}
    </div>
  );
}
