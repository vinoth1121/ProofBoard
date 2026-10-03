import { Modal } from '../../components/Modal';
import type { ReactNode } from 'react';
import { ProofFrame } from '../../components/ProofFrame';
import { PlayStatusTag } from '../../components/Tag';
import { BlueprintButton } from '../../components/States';
import { formatCount, formatDuration, formatFullStamp, formatStamp } from '../../lib/format';
import type { Play } from '../../lib/types';
import styles from './plays.module.css';

export interface ProofModalProps {
  readonly plays: readonly Play[];
  readonly index: number;
  readonly campaignName: string;
  readonly onIndexChange: (index: number) => void;
  readonly onClose: () => void;
  readonly pendingFlags: ReadonlySet<string>;
  readonly onFlag: (playId: string) => void;
}

/**
 * Full-bleed proof inspection. Focus is trapped, Escape closes, and the arrow
 * keys walk the whole timeline so an auditor can review a campaign's plays
 * without ever touching the mouse.
 */
export function ProofModal({
  plays,
  index,
  campaignName,
  onIndexChange,
  onClose,
  pendingFlags,
  onFlag,
}: ProofModalProps) {
  const play = plays[index];
  if (play === undefined) return null;

  const isFlagged = play.status === 'flagged';
  const pending = pendingFlags.has(play.id);

  const step = (delta: number) => {
    const next = (index + delta + plays.length) % plays.length;
    onIndexChange(next);
  };

  return (
    <Modal
      eyebrow={`Frame ${index + 1} of ${plays.length}`}
      title={play.screenId}
      subtitle={`${campaignName} · ${formatStamp(play.playedAt)}`}
      onClose={onClose}
      onNext={() => step(1)}
      onPrev={() => step(-1)}
      footer={
        <>
          <BlueprintButton variant="ghost" onClick={() => step(-1)} ariaLabel="Previous frame">
            ← Previous
          </BlueprintButton>
          <BlueprintButton
            variant={isFlagged ? 'ghost' : 'solid'}
            onClick={() => onFlag(play.id)}
            disabled={isFlagged || pending}
            ariaLabel={`Flag this play as suspicious`}
          >
            {pending ? 'Saving…' : isFlagged ? 'Flagged as suspicious' : 'Flag as suspicious'}
          </BlueprintButton>
          <BlueprintButton onClick={() => step(1)} ariaLabel="Next frame">
            Next →
          </BlueprintButton>
        </>
      }
    >
      <div className={styles.modalGrid}>
        <div className={styles.modalFrame}>
          <span className={styles.modalFrameImage}>
            <ProofFrame play={play} />
          </span>
        </div>

        <div className={styles.modalSide}>
          <dl className={styles.specList}>
            <SpecRow label="Play id" value={play.id.toUpperCase()} />
            <SpecRow label="Screen" value={play.screenId} />
            <SpecRow label="Location" value={play.screenName} />
            <SpecRow label="Captured" value={formatFullStamp(play.playedAt)} />
            <SpecRow label="Spot code" value={play.spotCode} />
            <SpecRow label="Duration" value={formatDuration(play.durationSec)} />
            <SpecRow label="Footfall" value={`${formatCount(play.footfall)} pax`} />
            <SpecRow label="Status" value={<PlayStatusTag status={play.status} />} />
          </dl>

          <p className={styles.rolloutNote}>
            Capture is generated from the play record — screen id and timestamp are burned into the
            frame so a screenshot taken from the road matches this row exactly.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.specRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
