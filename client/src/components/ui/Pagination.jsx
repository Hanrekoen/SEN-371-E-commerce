export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = [];
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  return (
    <nav aria-label="Catalogue pages">
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
        </li>

        {windowStart > 1 && (
          <li className="page-item">
            <button className="page-link" onClick={() => onChange(1)}>1</button>
          </li>
        )}
        {windowStart > 2 && (
          <li className="page-item disabled"><span className="page-link">…</span></li>
        )}

        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            <button className="page-link" onClick={() => onChange(p)}>{p}</button>
          </li>
        ))}


        {windowEnd < totalPages - 1 && (
          <li className="page-item disabled"><span className="page-link">…</span></li>
        )}
        {windowEnd < totalPages && (
          <li className="page-item">
            <button className="page-link" onClick={() => onChange(totalPages)}>{totalPages}</button>
          </li>
        )}

        <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}