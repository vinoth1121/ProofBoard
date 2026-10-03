import { useMemo } from 'react';
import { formatClock, formatDayMonth } from '../lib/format';
import type { Play } from '../lib/types';
import styles from './ProofFrame.module.css';

const W = 320;
const H = 180;

/** Stable 32-bit hash so a given play always renders the same artwork. */
function hash(input: string): number {
  let h = 0x811c_9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x0100_0193);
  }
  return h >>> 0;
}

/** A small deterministic generator bound to one play id. */
function makeDetailRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ProofFrameProps {
  readonly play: Play;
  /** Hide the heavy stamps on very small thumbnails. */
  readonly compact?: boolean;
  /** Extra context for screen readers, e.g. "Frame 3 of 40". */
  readonly contextLabel?: string;
}

/**
 * A generated "camera capture" of a digital screen at a point in time.
 *
 * ProofBoard ships no photography: every proof thumbnail is drawn from the
 * play record itself, so the artwork is deterministic, weighs nothing, and
 * still carries the two facts an auditor cares about — which screen, and when.
 */
export function ProofFrame({ play, compact = false, contextLabel }: ProofFrameProps) {
  const art = useMemo(() => {
    const rng = makeDetailRng(hash(play.id));
    const hue = play.creativeHue;
    const bars = Array.from({ length: 3 }, () => 30 + rng() * 90);
    const discR = 34 + rng() * 22;
    const discX = 70 + rng() * 150;
    const discY = 46 + rng() * 56;
    const slant = 8 + rng() * 22;
    const glowX = 20 + rng() * 240;
    const dots = Array.from({ length: 7 }, () => ({
      x: rng() * W,
      y: rng() * H,
      r: 0.6 + rng() * 1.5,
    }));
    return { hue, bars, discR, discX, discY, slant, glowX, dots };
  }, [play.id, play.creativeHue]);

  const { hue } = art;
  const gradientId = `pf-bg-${play.id}`;
  const statusColor =
    play.status === 'flagged' ? '#ff6b81' : play.status === 'unverified' ? '#f2b544' : '#4ade9a';
  const statusText =
    play.status === 'flagged'
      ? 'FLAGGED'
      : play.status === 'unverified'
        ? 'UNCORROBORATED'
        : 'VERIFIED';

  const label = `${play.screenId} captured ${formatDayMonth(play.playedAt)} at ${formatClock(
    play.playedAt,
  )}, ${statusText.toLowerCase()}${contextLabel !== undefined ? `, ${contextLabel}` : ''}`;

  return (
    <svg
      className={styles.frame}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      data-status={play.status}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 62% 26%)`} />
          <stop offset="52%" stopColor={`hsl(${(hue + 26) % 360} 58% 16%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 52) % 360} 54% 9%)`} />
        </linearGradient>
        <radialGradient id={`${gradientId}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`hsl(${hue} 90% 70%)`} stopOpacity="0.5" />
          <stop offset="100%" stopColor={`hsl(${hue} 90% 60%)`} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${gradientId}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity="0.18" />
        </pattern>
        <pattern
          id={`${gradientId}-unverified`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="2" height="8" fill="#f2b544" opacity="0.45" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill={`url(#${gradientId})`} />

      {/* The creative itself: a disc, a headline block, a rule, a text block. */}
      <circle
        cx={art.discX}
        cy={art.discY}
        r={art.discR}
        fill={`hsl(${(hue + 180) % 360} 84% 62%)`}
        opacity="0.9"
      />
      <circle
        cx={art.discX}
        cy={art.discY}
        r={art.discR}
        fill="none"
        stroke="#eef4ff"
        strokeWidth="1"
        opacity="0.5"
      />
      <g transform={`rotate(${art.slant - 20} ${W / 2} ${H / 2})`}>
        {art.bars.map((width, i) => (
          <rect
            key={i}
            x={22}
            y={112 + i * 11}
            width={width}
            height={5}
            fill="#eef4ff"
            opacity={0.9 - i * 0.22}
          />
        ))}
      </g>
      <rect x={22} y={100} width={62} height={2} fill="#eef4ff" opacity="0.75" />
      <rect x={W - 96} y={22} width={74} height={44} fill="#eef4ff" opacity="0.12" />
      <rect x={W - 92} y={26} width={58} height={6} fill="#eef4ff" opacity="0.5" />
      <rect x={W - 92} y={38} width={40} height={6} fill="#eef4ff" opacity="0.35" />

      {/* Camera artefacts: glow, dust, scanlines. */}
      <circle cx={art.glowX} cy={30} r="70" fill={`url(#${gradientId}-glow)`} />
      <g opacity="0.5">
        {art.dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill="#eef4ff" opacity="0.5" />
        ))}
      </g>
      <rect width={W} height={H} fill={`url(#${gradientId}-scan)`} className={styles.scanlines} />

      {play.status === 'unverified' ? (
        <rect width={W} height={H} fill={`url(#${gradientId}-unverified)`} opacity="0.5" />
      ) : null}

      {/* Corner crop marks burned into the capture. */}
      <g stroke="#eef4ff" strokeWidth="1" opacity="0.55">
        <path d="M6 14 V6 H14" fill="none" />
        <path d={`M${W - 14} 6 H${W - 6} V14`} fill="none" />
        <path d={`M6 ${H - 14} V${H - 6} H14`} fill="none" />
        <path d={`M${W - 14} ${H - 6} H${W - 6} V${H - 14}`} fill="none" />
      </g>

      {/* Stamps: screen id + time are the whole point of a proof of play. */}
      <g className={styles.text}>
        <text x={12} y={24} className={`${styles.text} ${styles.stamp} ${styles.screenId}`}>
          {play.screenId}
        </text>
        <text x={W - 12} y={24} className={`${styles.text} ${styles.stamp} ${styles.clock}`}>
          {formatDayMonth(play.playedAt)} {formatClock(play.playedAt)}
        </text>
        {!compact ? (
          <text
            x={12}
            y={H - 11}
            className={`${styles.text} ${styles.stamp} ${styles.stampQuiet} ${styles.footLeft}`}
          >
            {play.spotCode} · {play.screenName}
          </text>
        ) : null}
        <text
          x={W - 12}
          y={H - 11}
          className={`${styles.text} ${styles.stamp} ${styles.footRight}`}
        >
          {statusText}
        </text>
      </g>

      {/* Status lamp. */}
      <circle cx={W - 18} cy={H - 16} r="3.5" fill={statusColor} />
      {play.status === 'flagged' ? (
        <circle
          cx={W - 18}
          cy={H - 16}
          r="7"
          fill="none"
          stroke={statusColor}
          strokeWidth="1"
          opacity="0.8"
        />
      ) : null}
    </svg>
  );
}
