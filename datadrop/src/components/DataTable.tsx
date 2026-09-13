interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function DataTable({ columns, rows }: Props) {
  if (rows.length === 0) {
    return <div className="empty-state">Query returned no rows.</div>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no unique id, using index as key
            <tr key={i}>
              {columns.map((col) => {
                const val = row[col];
                const isNull = val === null || val === undefined;
                return (
                  <td key={col} className={isNull ? "cell--null" : ""}>
                    {formatCell(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
