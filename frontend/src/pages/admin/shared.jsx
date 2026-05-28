import { useMemo, useState } from "react";
import { formatNumber } from "./utils";

export function StatusBadge({ status, inactive }) {
  const isInactive = inactive || status === "inactive" || status === false;
  const label = isInactive
    ? "Inactive"
    : status === true
      ? "Active"
      : status || "Active";

  return (
    <span
      className={
        isInactive ? "status-badge status-badge--inactive" : "status-badge"
      }
    >
      {label}
    </span>
  );
}

export function Toast({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  return (
    <div className={`toast-notice toast-notice--${notice.type}`} role="alert">
      <div>
        <span>{notice.type}</span>
        <p>{notice.message}</p>
      </div>
      <button aria-label="Dismiss notification" onClick={onClose} type="button">
        x
      </button>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  emptyText = "No records found.",
  pageSize = 10,
  searchPlaceholder = "Search table",
}) {
  const pageSizeOptions = [5, 10, 25, 50, 100];
  const [searchText, setSearchText] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState(pageSize);

  const normalizedSearchText = searchText.trim().toLowerCase();

  const processedRows = useMemo(() => {
    const filteredRows = normalizedSearchText
      ? rows.filter((row) =>
          columns.some((column) => {
            if (column.searchable === false) {
              return false;
            }

            const value = column.searchValue
              ? column.searchValue(row)
              : row[column.key];

            return String(value ?? "")
              .toLowerCase()
              .includes(normalizedSearchText);
          }),
        )
      : rows;

    if (!sortConfig.key) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.key === sortConfig.key);
    if (!sortColumn) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = sortColumn.sortValue
        ? sortColumn.sortValue(left)
        : left[sortColumn.key];
      const rightValue = sortColumn.sortValue
        ? sortColumn.sortValue(right)
        : right[sortColumn.key];
      const comparison = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      );

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [columns, normalizedSearchText, rows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / selectedPageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = processedRows.slice(
    (currentPage - 1) * selectedPageSize,
    currentPage * selectedPageSize,
  );

  const changeSort = (column) => {
    if (column.sortable === false) {
      return;
    }

    setSortConfig((current) => ({
      key: column.key,
      direction:
        current.key === column.key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const updateSearchText = (value) => {
    setSearchText(value);
    setPage(1);
  };

  const updatePageSize = (value) => {
    setSelectedPageSize(Number(value));
    setPage(1);
  };

  return (
    <div className="data-table">
      <div className="data-table__toolbar">
        <input
          aria-label={searchPlaceholder}
          onChange={(event) => updateSearchText(event.target.value)}
          placeholder={searchPlaceholder}
          value={searchText}
        />
        <div className="data-table__toolbar-actions">
          <label>
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              onChange={(event) => updatePageSize(event.target.value)}
              value={selectedPageSize}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span>
            {formatNumber(processedRows.length)} / {formatNumber(rows.length)}
          </span>
        </div>
      </div>

      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    disabled={column.sortable === false}
                    onClick={() => changeSort(column)}
                    type="button"
                  >
                    <span>{column.label}</span>
                    {sortConfig.key === column.key && (
                      <b>{sortConfig.direction === "asc" ? "Asc" : "Desc"}</b>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id || row.username || row.fileName || rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : String(row[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {processedRows.length > selectedPageSize && (
        <div className="data-table__pagination">
          <button
            className="secondary-action"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="secondary-action"
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
