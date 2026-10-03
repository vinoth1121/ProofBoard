import { Link } from 'react-router-dom';
import { BlueprintSheet, DimensionLine } from '../../components/Blueprint';
import { BlueprintButton, EmptyState } from '../../components/States';
import styles from './plays.module.css';

/** A campaign id that is not in the index — distinct from a failed request. */
export function CampaignNotFound({ id }: { id: string }) {
  const trimmed = id.trim();

  return (
    <div className={styles.page}>
      <Link to="/campaigns" className={styles.backLink}>
        ← All campaigns
      </Link>

      <BlueprintSheet>
        <EmptyState
          variant="notfound"
          title={trimmed === '' ? 'No campaign selected' : `No campaign “${trimmed}”`}
          message={
            trimmed === ''
              ? 'Pick a campaign from the index to open its proof-of-play timeline.'
              : 'That reference is not in the index. It may have been archived, or the link may have been mistyped.'
          }
          action={
            <Link to="/campaigns">
              <BlueprintButton>Back to campaign index</BlueprintButton>
            </Link>
          }
        />
      </BlueprintSheet>

      <DimensionLine label="END OF SHEET" />
    </div>
  );
}
