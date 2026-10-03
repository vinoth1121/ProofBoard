import { Link } from 'react-router-dom';
import { BlueprintSheet, DimensionLine } from '../components/Blueprint';
import { BlueprintButton, EmptyState } from '../components/States';
import styles from './NotFoundPage.module.css';

/** Catch-all route: an unknown URL gets a drawn 404, not a blank page. */
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <BlueprintSheet className={styles.sheet}>
        <EmptyState
          variant="notfound"
          title="This sheet is not in the drawing set"
          message="The address you followed does not match any view in ProofBoard. Check the link, or start again from the campaign index."
          action={
            <div className={styles.links}>
              <Link to="/campaigns">
                <BlueprintButton>Campaign index</BlueprintButton>
              </Link>
              <a href="/campaigns?status=live">
                <BlueprintButton variant="ghost">Live campaigns only</BlueprintButton>
              </a>
            </div>
          }
        />
      </BlueprintSheet>

      <p className={styles.code}>
        <b>404</b>
        <span>unknown route</span>
      </p>

      <DimensionLine label="SHEET NOT FOUND" />
    </div>
  );
}
