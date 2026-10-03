import { BlueprintSheet } from '../../components/Blueprint';
import { formatCount } from '../../lib/format';
import type { PlayStats } from '../../lib/types';
import styles from './plays.module.css';

export interface StatsHeaderProps {
  readonly stats: PlayStats;
}

/**
 * The three numbers an advertiser actually disputes: delivered vs booked, the
 * shortfall between them, and the completion rate.
 */
export function StatsHeader({ stats }: StatsHeaderProps) {
  const shortfall = Math.max(0, stats.booked - stats.delivered);

  return (
    <BlueprintSheet tone="raised" cropMarks={false}>
      <div className={styles.stats}>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>Plays delivered</span>
          <span className={styles.statValue}>{formatCount(stats.delivered)}</span>
          <span className={styles.statSub}>of {formatCount(stats.booked)} booked</span>
          <span className={styles.bar} role="presentation">
            <span
              className={styles.barFill}
              style={{ width: `${Math.min(100, stats.completion)}%` }}
            />
          </span>
        </div>

        <div className={styles.statCell}>
          <span className={styles.statLabel}>Shortfall</span>
          <span className={styles.statValue}>{shortfall === 0 ? '—' : formatCount(shortfall)}</span>
          <span className={styles.statSub}>
            {shortfall === 0 ? 'Fully delivered' : 'Plots not captured'}
          </span>
          <span className={styles.bar} role="presentation">
            <span
              className={`${styles.barFill} ${shortfall > 0 ? styles.barOver : ''}`}
              style={{
                width: `${stats.booked === 0 ? 0 : Math.min(100, (shortfall / stats.booked) * 100)}%`,
              }}
            />
          </span>
        </div>

        <div className={styles.statCell}>
          <span className={styles.statLabel}>Completion</span>
          <span className={`${styles.statValue} ${styles.statValueAccent}`}>
            {formatCount(stats.completion)}%
          </span>
          <span className={styles.statSub}>
            {formatCount(stats.verified)} verified · {formatCount(stats.flagged)} flagged
          </span>
          <span className={styles.bar} role="presentation">
            <span
              className={styles.barFill}
              style={{ width: `${Math.min(100, stats.completion)}%` }}
            />
          </span>
        </div>
      </div>
    </BlueprintSheet>
  );
}
