import { ProofFrame } from '../../components/ProofFrame';
import { PlayStatusTag } from '../../components/Tag';
import { formatDuration, formatShortTime, formatStamp } from '../../lib/format';
import type { Play } from '../../lib/types';
import styles from './plays.module.css';

export interface PlayTableProps {
  readonly plays: readonly Play[];
  readonly pendingFlags: ReadonlySet<string>;
  readonly onOpenProof: (index: number) => void;
  readonly onFlag: (playId: string) => void;
}

export function PlayTable({ plays, pendingFlags, onOpenProof, onFlag }: PlayTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="sr-only">
          Play log for this campaign. Each row is one verified, uncorroborated or flagged play.
        </caption>
        <thead className={styles.tableHead}>
          <tr>
            <th scope="col">Proof</th>
            <th scope="col">Played at</th>
            <th scope="col">Screen</th>
            <th scope="col">Spot</th>
            <th scope="col">Footfall</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {plays.map((play, index) => {
            const pending = pendingFlags.has(play.id);
            const isFlagged = play.status === 'flagged';
            return (
              <tr key={play.id} data-flagged={isFlagged ? 'true' : 'false'}>
                <td>
                  <button
                    type="button"
                    className={styles.thumbButton}
                    onClick={() => onOpenProof(index)}
                    aria-label={`Open full proof for play on screen ${play.screenId} at ${formatStamp(
                      play.playedAt,
                    )}`}
                  >
                    <span className={styles.thumbImage}>
                      <ProofFrame play={play} compact />
                    </span>
                  </button>
                </td>
                <td className={styles.monoStrong}>{formatShortTime(play.playedAt)}</td>
                <td>
                  <span className={styles.screenCell}>
                    <span className={styles.monoStrong}>{play.screenId}</span>
                    <span className={styles.mono}>{play.screenName}</span>
                  </span>
                </td>
                <td className={styles.mono}>
                  {play.spotCode}
                  <br />
                  {formatDuration(play.durationSec)}
                </td>
                <td className={styles.mono}>{play.footfall} pax</td>
                <td>
                  <PlayStatusTag status={play.status} />
                </td>
                <td className={styles.cellRight}>
                  <button
                    type="button"
                    className={`${styles.flagButton} ${isFlagged ? styles.flagDone : ''}`}
                    onClick={() => onFlag(play.id)}
                    disabled={isFlagged || pending}
                    aria-label={
                      isFlagged
                        ? `Play on ${play.screenId} at ${formatShortTime(play.playedAt)} is already flagged as suspicious`
                        : `Flag play on screen ${play.screenId} at ${formatShortTime(play.playedAt)} as suspicious`
                    }
                  >
                    {pending ? (
                      <>
                        <span className={styles.spinner} aria-hidden="true" />
                        Saving
                      </>
                    ) : isFlagged ? (
                      'Flagged'
                    ) : (
                      'Flag'
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
