import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import type { ThemeName } from '../hooks/useTheme';
import styles from './AppShell.module.css';

function BrandMark() {
  return (
    <svg
      className={styles.mark}
      width="30"
      height="30"
      viewBox="0 0 30 30"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.5"
        y="0.5"
        width="29"
        height="29"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
      />
      <path
        d="M0.5 8.5 H29.5 M0.5 21.5 H29.5 M8.5 0.5 V29.5 M21.5 0.5 V29.5"
        stroke="var(--line-strong)"
        strokeWidth="0.6"
      />
      <rect x="10.5" y="10.5" width="9" height="11" fill="var(--accent)" opacity="0.9" />
      <path
        d="M0.5 4.5 H4.5 M25.5 4.5 H29.5 M0.5 25.5 H4.5 M25.5 25.5 H29.5"
        stroke="var(--accent)"
        strokeWidth="1"
      />
    </svg>
  );
}

export function ThemeToggle({ theme, onToggle }: { theme: ThemeName; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={styles.themeButton}
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'paper blueprint' : 'deep navy'} theme`}
      aria-pressed={theme === 'light'}
    >
      <span aria-hidden="true">{theme === 'dark' ? '◐' : '◑'}</span>
      {theme === 'dark' ? 'Paper' : 'Navy'}
    </button>
  );
}

export function AppHeader() {
  const [theme, toggle] = useTheme();

  return (
    <header className={styles.header}>
      <Link to="/campaigns" className={styles.brand} aria-label="ProofBoard home">
        <BrandMark />
        <span className={styles.wordmark}>
          <span className={styles.wordmarkName}>
            Proof<em>Board</em>
          </span>
          <span className={styles.wordmarkTag}>Proof-of-play explorer</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        <NavLink
          to="/campaigns"
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        >
          Campaigns
        </NavLink>
      </nav>

      <div className={styles.controls}>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerNote}>ProofBoard · every frame is a spot that verifiably ran</p>
        <p className={styles.footerSpec}>
          <span>
            API <b>MSW</b>
          </span>
          <span>
            DATA <b>SEEDED</b>
          </span>
          <span>
            FAULT INJECTION <b>10%</b>
          </span>
          <span>
            LATENCY <b>400–900MS</b>
          </span>
        </p>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader />
      <main id="main">{children}</main>
      <AppFooter />
    </>
  );
}
