import type { ReactNode } from 'react';
import styles from './States.module.css';

export interface ErrorStateProps {
  readonly title: string;
  readonly message: string;
  /** Machine-readable code shown as a stamped plate, e.g. `HTTP 500`. */
  readonly code?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  /** Secondary action, e.g. "clear filters". */
  readonly secondary?: ReactNode;
}

/** Failure panel: a halted drawing with a stamped error plate and a retry. */
export function ErrorState({
  title,
  message,
  code,
  onRetry,
  retryLabel = 'Retry request',
  secondary,
}: ErrorStateProps) {
  return (
    <div className={styles.frame} role="alert">
      <svg viewBox="0 0 400 120" width="100%" height="120" aria-hidden="true" focusable="false">
        <defs>
          <pattern
            id="err-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--line-strong)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x="16" y="16" width="368" height="88" fill="url(#err-hatch)" opacity="0.5" />
        <rect
          x="16"
          y="16"
          width="368"
          height="88"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <g stroke="var(--flagged)" strokeWidth="3">
          <line x1="176" y1="42" x2="224" y2="78" />
          <line x1="224" y1="42" x2="176" y2="78" />
        </g>
        <g stroke="var(--line-strong)" strokeWidth="1">
          <path d="M16 30 V16 H30" fill="none" />
          <path d="M370 16 H384 V30" fill="none" />
          <path d="M16 90 V104 H30" fill="none" />
          <path d="M370 104 H384 V90" fill="none" />
        </g>
      </svg>
      <div className={styles.wrap}>
        <p className={styles.detail}>Sheet could not be plotted</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        {code !== undefined ? (
          <p>
            <span className={styles.code}>{code}</span>
          </p>
        ) : null}
        <div className={styles.actions}>
          {onRetry !== undefined ? (
            <button type="button" className={styles.button} onClick={onRetry}>
              {retryLabel}
            </button>
          ) : null}
          {secondary}
        </div>
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly action?: ReactNode;
  /** Illustration variant. */
  readonly variant?: 'search' | 'range' | 'notfound';
}

const ILLUSTRATIONS: Record<NonNullable<EmptyStateProps['variant']>, ReactNode> = {
  search: (
    <g>
      <rect
        x="120"
        y="26"
        width="120"
        height="70"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1"
      />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1="132"
          y1={44 + i * 14}
          x2={i === 2 ? 200 : 226}
          y2={44 + i * 14}
          stroke="var(--line)"
          strokeWidth="2"
        />
      ))}
      <circle cx="252" cy="76" r="24" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <line x1="270" y1="94" x2="290" y2="112" stroke="var(--accent)" strokeWidth="3" />
    </g>
  ),
  range: (
    <g>
      <line x1="60" y1="70" x2="300" y2="70" stroke="var(--line-strong)" strokeWidth="1" />
      <line x1="60" y1="64" x2="60" y2="76" stroke="var(--line-strong)" strokeWidth="1" />
      <line x1="300" y1="64" x2="300" y2="76" stroke="var(--line-strong)" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={70 + i * 50}
          y={54}
          width={32}
          height={32}
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      <rect
        x="170"
        y="54"
        width="32"
        height="32"
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth="1"
      />
    </g>
  ),
  notfound: (
    <g>
      <path
        d="M180 20 L200 44 L220 20 L260 20 L260 104 L140 104 L140 20 Z"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <path d="M180 20 L200 44 L220 20" fill="none" stroke="var(--line)" strokeWidth="1" />
      <text
        x="200"
        y="82"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="22"
        fill="var(--accent)"
      >
        404
      </text>
    </g>
  ),
};

/** Nothing here yet — drawn as an empty plot, not a shrug. */
export function EmptyState({ title, message, action, variant = 'search' }: EmptyStateProps) {
  return (
    <div className={styles.frame}>
      <svg viewBox="0 0 360 130" width="100%" height="130" aria-hidden="true" focusable="false">
        {ILLUSTRATIONS[variant]}
      </svg>
      <div className={styles.wrap}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        {action !== undefined ? <div className={styles.actions}>{action}</div> : null}
      </div>
    </div>
  );
}

export interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: 'solid' | 'ghost';
  readonly type?: 'button' | 'submit';
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
  readonly title?: string;
}

export function BlueprintButton({
  children,
  onClick,
  variant = 'solid',
  type = 'button',
  disabled = false,
  ariaLabel,
  title,
}: ButtonProps) {
  const classes = [styles.button, variant === 'ghost' ? styles.buttonGhost : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}
