import styles from './Skeleton.module.css';

function Bar({ className, width }: { className: string; width?: string }) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={width !== undefined ? { width } : undefined}
    />
  );
}

/** Placeholder that mirrors the campaign grid layout. */
export function CampaignGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles.card}`}>
          <Bar className={styles.lineLabel} />
          <Bar className={styles.lineTitle} />
          <Bar className={styles.lineSm} width="52%" />
          <Bar className={styles.line} width="88%" />
          <div className={styles.statRow}>
            <Bar className={`${styles.skeleton} ${styles.stat}`} />
            <Bar className={`${styles.skeleton} ${styles.stat}`} />
            <Bar className={`${styles.skeleton} ${styles.stat}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for the detail header: three big numerals plus a rule. */
export function StatsSkeleton() {
  return (
    <div
      className={styles.statRow}
      style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
      aria-hidden="true"
    >
      <Bar className={`${styles.skeleton} ${styles.stat}`} />
      <Bar className={`${styles.skeleton} ${styles.stat}`} />
      <Bar className={`${styles.skeleton} ${styles.stat}`} />
    </div>
  );
}

/** Placeholder for the film strip. */
export function FilmStripSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className={styles.frameStrip} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Bar key={i} className="" />
      ))}
    </div>
  );
}

/** Placeholder for the play log table. */
export function PlayTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={styles.table} aria-hidden="true">
      <Bar className={`${styles.skeleton} ${styles.tableRow} ${styles.tableHead}`} />
      {Array.from({ length: rows }, (_, i) => (
        <Bar key={i} className={`${styles.skeleton} ${styles.tableRow}`} />
      ))}
    </div>
  );
}
