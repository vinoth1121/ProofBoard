import type { CampaignStatus, PlayStatus } from '../lib/types';
import styles from './Tag.module.css';

const CAMPAIGN_LABEL: Record<CampaignStatus, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  ended: 'Ended',
};

const PLAY_LABEL: Record<PlayStatus, string> = {
  verified: 'Verified',
  unverified: 'Uncorroborated',
  flagged: 'Flagged',
};

export function CampaignStatusTag({ status }: { status: CampaignStatus }) {
  return (
    <span className={`${styles.tag} ${styles[status]}`} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {CAMPAIGN_LABEL[status]}
    </span>
  );
}

export function PlayStatusTag({ status }: { status: PlayStatus }) {
  return (
    <span className={`${styles.tag} ${styles[status]}`} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {PLAY_LABEL[status]}
    </span>
  );
}
