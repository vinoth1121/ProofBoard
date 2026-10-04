import type { ReactNode } from 'react';
import { useId } from 'react';
import styles from './Blueprint.module.css';

type SheetTone = 'default' | 'raised' | 'inset';

export interface BlueprintSheetProps {
  readonly children: ReactNode;
  readonly tone?: SheetTone;
  /** Corner registration marks. Off for nested/inline surfaces. */
  readonly cropMarks?: boolean;
  readonly className?: string | undefined;
  /** Applied to the outer element so lists can drive layout from the parent. */
  readonly style?: React.CSSProperties | undefined;
}

/**
 * The base surface of the whole app: a sheet of "paper" with corner crop
 * marks, echoing a physical drawing on a desk.
 */
export function BlueprintSheet({
  children,
  tone = 'default',
  cropMarks = true,
  className,
  style,
}: BlueprintSheetProps) {
  const toneClass =
    tone === 'raised' ? styles.sheetRaised : tone === 'inset' ? styles.sheetInset : '';

  const classes = [styles.sheet, toneClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {cropMarks ? (
        <>
          <span className={cropClass('tl')} aria-hidden="true" />
          <span className={cropClass('tr')} aria-hidden="true" />
          <span className={cropClass('bl')} aria-hidden="true" />
          <span className={cropClass('br')} aria-hidden="true" />
        </>
      ) : null}
      {children}
    </div>
  );
}

function cropClass(position: 'tl' | 'tr' | 'bl' | 'br'): string {
  const map = {
    tl: styles.cropTl,
    tr: styles.cropTr,
    bl: styles.cropBl,
    br: styles.cropBr,
  } as const;
  return `${styles.crop} ${map[position]}`;
}

export interface DimensionLineProps {
  /** Measurement text, e.g. `1024 × 268 PX` or `18 DAYS`. */
  readonly label: string;
  /** Which surface colour sits behind the label, so it can punch through. */
  readonly over?: 'ground' | 'sheet' | 'sheet-raised';
}

/**
 * A measurement rule with sloped end ticks — the classic way a drawing states
 * a dimension. Purely decorative, so it is hidden from assistive tech.
 */
export function DimensionLine({ label, over = 'ground' }: DimensionLineProps) {
  const id = useId();
  const overClass =
    over === 'sheet'
      ? styles.dimensionOverSheet
      : over === 'sheet-raised'
        ? styles.dimensionOverSheetRaised
        : '';

  return (
    <div className={`${styles.dimension} ${overClass}`} aria-hidden="true">
      <svg viewBox="0 0 300 18" preserveAspectRatio="none" focusable="false" role="presentation">
        <defs>
          <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6 L6 0" stroke="currentColor" strokeWidth="1" opacity="0.25" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="18" fill={`url(#${id}-hatch)`} />
        <line x1="0" y1="9" x2="300" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="4" y1="4" x2="0" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="9" x2="4" y2="14" stroke="currentColor" strokeWidth="1" />
        <line x1="300" y1="4" x2="296" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="296" y1="9" x2="300" y2="14" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className={styles.dimensionLabel}>{label}</span>
    </div>
  );
}

export interface TitleBlockProps {
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly id?: string;
}

/** The "title block" that every real drawing carries in its lower-right corner. */
export function TitleBlock({ title, meta, actions, headingLevel = 2, id }: TitleBlockProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={styles.titleBlock}>
      <div className={styles.titleBlockText}>
        <Heading className={styles.titleBlockTitle} id={id}>
          {title}
        </Heading>
        {meta !== undefined ? <span className={styles.titleBlockMeta}>{meta}</span> : null}
      </div>
      {actions !== undefined ? <div>{actions}</div> : null}
    </div>
  );
}
