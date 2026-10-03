import { Link } from 'react-router-dom';
import { BlueprintSheet, DimensionLine } from '../../components/Blueprint';
import { CampaignStatusTag } from '../../components/Tag';
import { completionPct } from '../../lib/filters';
import { formatCompact, formatCount, formatDayMonth, formatSpanDays } from '../../lib/format';
import type { Campaign } from '../../lib/types';
import styles from './campaigns.module.css';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const completion = completionPct(campaign);
  const span = formatSpanDays(campaign.startDate, campaign.endDate);

  return (
    <BlueprintSheet className={styles.card} tone="raised">
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardId}>{campaign.id.toUpperCase()}</p>
          <h3 className={styles.cardName}>
            {/* Stretched link: the whole card is the hit target. */}
            <Link to={`/campaigns/${campaign.id}`} className={styles.cardLink}>
              {campaign.name}
            </Link>
          </h3>
        </div>
        <CampaignStatusTag status={campaign.status} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardMeta}>
          <span>
            City <b>{campaign.city}</b>
          </span>
          <span>
            Screens <b>{campaign.screenCount}</b>
          </span>
          <span>
            Creative <b>{campaign.creativeCode}</b>
          </span>
        </p>

        <DimensionLine
          label={`${formatDayMonth(campaign.startDate)} → ${formatDayMonth(campaign.endDate)}`}
          over="sheet-raised"
        />

        <div className={styles.cardStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatCompact(campaign.deliveredPlays)}</span>
            <span className={styles.statLabel}>Delivered</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatCompact(campaign.bookedPlays)}</span>
            <span className={styles.statLabel}>Booked</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValue} ${styles.statValueAccent}`}>
              {formatCount(completion)}%
            </span>
            <span className={styles.statLabel}>Complete</span>
            <span className={styles.meter} role="presentation">
              <span className={styles.meterFill} style={{ width: `${completion}%` }} />
            </span>
          </div>
        </div>
      </div>

      <p className={styles.cardFoot}>
        <span>{span}</span>
        <span className={styles.cardFootCta} aria-hidden="true">
          Open timeline →
        </span>
      </p>
    </BlueprintSheet>
  );
}
