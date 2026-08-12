export function PaginationControls({
  label,
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  label: string;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <nav className="pagination-bar" aria-label={label}>
      <span>
        {start}-{end} of {total}
      </span>
      <div>
        <button
          className="button button-secondary compact-button"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <strong>
          Page {page} / {pageCount}
        </strong>
        <button
          className="button button-secondary compact-button"
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
