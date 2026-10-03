import { useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly subtitle?: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Arrow-key navigation is advertised and enabled only when provided. */
  readonly onNext?: () => void;
  readonly onPrev?: () => void;
  readonly width?: 'wide' | 'narrow';
}

/**
 * A dialog that behaves like a real modal surface:
 *
 * - focus moves inside on open and is restored to the trigger on close
 * - Tab and Shift+Tab cycle within the dialog only (focus trap)
 * - Escape closes
 * - Arrow keys page through content when `onPrev`/`onNext` are supplied
 * - background scroll is locked while open
 */
export function Modal({
  title,
  eyebrow,
  subtitle,
  onClose,
  children,
  footer,
  onNext,
  onPrev,
  width = 'wide',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const focusables = useCallback((): HTMLElement[] => {
    const node = dialogRef.current;
    if (!node) return [];
    return [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }, []);

  // Move focus in on open; put it back on the trigger on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const first = focusables()[0];
    (first ?? dialogRef.current)?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [focusables]);

  // Lock background scroll, compensating for the scrollbar so the layout
  // doesn't jump when the dialog opens.
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'ArrowRight' && onNext !== undefined) {
      event.preventDefault();
      onNext();
      return;
    }

    if (event.key === 'ArrowLeft' && onPrev !== undefined) {
      event.preventDefault();
      onPrev();
      return;
    }

    if (event.key !== 'Tab') return;

    const items = focusables();
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;

    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${width === 'narrow' ? styles.dialogNarrow : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <div className={styles.headings}>
            {eyebrow !== undefined ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
            <h2 className={styles.title} id={titleId}>
              {title}
            </h2>
            {subtitle !== undefined ? <div className={styles.subtitle}>{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd>esc</kbd> close · <kbd>←</kbd> <kbd>→</kbd> step frames
          </span>
          {footer !== undefined ? <div className={styles.footerActions}>{footer}</div> : null}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
