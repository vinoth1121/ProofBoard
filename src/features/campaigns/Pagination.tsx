import styles from './campaigns.module.css';
import { pageWindow } from './pageWindow';

export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly pageSize: number;
  readonly onChange: (page: number) => void;
  /** Items currently rendered, for the "1–6 of 24" range readout. */
  readonly shown: number;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  shown,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Campaign list pages">
      <p className={styles.pageIndicator}>
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
      </p>

      <div className={styles.pageButtons}>
        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ←
        </button>

        {window.map((p, index) => {
          const previous = window[index - 1];
          const gap = previous !== undefined && p - previous > 1;
          return (
            <span key={p} style={{ display: 'contents' }}>
              {gap ? (
                <span className={styles.pageGap} aria-hidden="true">
                  …
                </span>
              ) : null}
              <button
                type="button"
                className={`${styles.pageButton} ${p === page ? styles.pageButtonActive : ''}`}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p} of ${totalPages}`}
              >
                {p}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          →
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        Page {page} of {totalPages}, showing {shown} campaigns.
      </span>
    </nav>
  );
}
