import type { Play } from '../../lib/types';
import { ProofFrame } from '../../components/ProofFrame';
import { formatShortTime } from '../../lib/format';
import styles from './plays.module.css';

export interface FilmStripTimelineProps {
  readonly plays: readonly Play[];
  /** Index of the frame highlighted as "current". */
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
  readonly caption: string;
}

/**
 * The signature view: a horizontal film strip where every play is a frame.
 *
 * Scrolls horizontally like real film, is fully keyboard operable (each frame
 * is a button, so Tab and Enter come free), and reports its position to screen
 * readers via the button labels.
 */
export function FilmStripTimeline({
  plays,
  activeIndex,
  onSelect,
  caption,
}: FilmStripTimelineProps) {
  return (
    <div className={styles.stripWrap}>
      <div className={styles.stripHead}>
        <h2 className={styles.stripTitle}>Proof-of-play timeline</h2>
        <p className={styles.stripMeta}>{caption}</p>
      </div>

      <div className={styles.strip}>
        <span className={`${styles.sprockets} ${styles.sprocketsTop}`} aria-hidden="true" />
        <span className={`${styles.sprockets} ${styles.sprocketsBottom}`} aria-hidden="true" />

        {plays.length === 0 ? (
          <p className={styles.stripEmpty}>No frames in this date window</p>
        ) : (
          <ol className={styles.stripTrack} aria-label="Play frames, oldest first">
            {plays.map((play, index) => {
              const active = index === activeIndex;
              return (
                <li key={play.id}>
                  <button
                    type="button"
                    className={`${styles.frameButton} ${active ? styles.frameActive : ''}`}
                    onClick={() => onSelect(index)}
                    aria-current={active ? 'true' : undefined}
                    aria-label={`Frame ${index + 1} of ${plays.length}. Screen ${play.screenId}, ${formatShortTime(
                      play.playedAt,
                    )}. Status ${play.status}. Open proof.`}
                  >
                    <span className={styles.frameImage}>
                      <ProofFrame
                        play={play}
                        compact
                        contextLabel={`Frame ${index + 1} of ${plays.length}`}
                      />
                    </span>

                    {play.status === 'flagged' ? (
                      <span className={styles.frameFlag} aria-hidden="true">
                        !
                      </span>
                    ) : null}
                    {play.status === 'unverified' ? (
                      <span className={styles.frameUnverified} aria-hidden="true" />
                    ) : null}

                    <span className={styles.frameCaption} aria-hidden="true">
                      <span>{play.screenId}</span>
                      <span className={styles.frameIndex}>{formatShortTime(play.playedAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
