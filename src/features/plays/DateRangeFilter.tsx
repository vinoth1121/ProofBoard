import { formatDayMonth } from '../../lib/format';
import styles from './plays.module.css';

export interface DateRangeFilterProps {
  /** ISO timestamps or null for unbounded. */
  readonly from: string | null;
  readonly to: string | null;
  readonly flightStart: string;
  readonly flightEnd: string;
  readonly isActive: boolean;
  readonly onChange: (range: { from: string | null; to: string | null }) => void;
}

function toInputValue(iso: string | null): string {
  return iso === null ? '' : iso.slice(0, 10);
}

/** Quick windows, expressed in days back from the latest play in the flight. */
const PRESETS = [7, 30, 90] as const;

export function DateRangeFilter({
  from,
  to,
  flightStart,
  flightEnd,
  isActive,
  onChange,
}: DateRangeFilterProps) {
  const flightStartInput = toInputValue(flightStart);
  const flightEndInput = toInputValue(flightEnd);
  const fromInput = toInputValue(from);
  const toInput = toInputValue(to);

  const presetActive = (days: number): boolean => {
    if (from === null || to === null) return false;
    const span = new Date(to).getTime() - new Date(from).getTime();
    return Math.round(span / 86_400_000) === days - 1;
  };

  const applyPreset = (days: number) => {
    const end = new Date(`${flightEndInput}T23:59:59.000Z`).getTime();
    const start = end - (days - 1) * 86_400_000;
    onChange({
      from: new Date(start).toISOString(),
      to: new Date(end).toISOString(),
    });
  };

  return (
    <div className={styles.rangeBar}>
      <div className={styles.rangeField}>
        <label className={styles.label} htmlFor="range-from">
          From
        </label>
        <input
          id="range-from"
          type="date"
          className={styles.dateInput}
          value={fromInput}
          min={flightStartInput}
          max={flightEndInput}
          onChange={(event) =>
            onChange({
              from: event.target.value === '' ? null : `${event.target.value}T00:00:00.000Z`,
              to,
            })
          }
        />
      </div>

      <div className={styles.rangeField}>
        <label className={styles.label} htmlFor="range-to">
          To
        </label>
        <input
          id="range-to"
          type="date"
          className={styles.dateInput}
          value={toInput}
          min={flightStartInput}
          max={flightEndInput}
          onChange={(event) =>
            onChange({
              from,
              to: event.target.value === '' ? null : `${event.target.value}T23:59:59.999Z`,
            })
          }
        />
      </div>

      <div className={styles.rangeField}>
        <span className={styles.label}>Quick window</span>
        <div className={styles.presetRow}>
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              className={`${styles.presetButton} ${presetActive(days) ? styles.presetActive : ''}`}
              onClick={() => applyPreset(days)}
              aria-pressed={presetActive(days)}
            >
              Last {days}d
            </button>
          ))}
          <button
            type="button"
            className={`${styles.presetButton} ${isActive ? '' : styles.presetActive}`}
            onClick={() => onChange({ from: null, to: null })}
            aria-pressed={!isActive}
          >
            Full flight
          </button>
        </div>
      </div>

      <div className={styles.rangeFieldEnd}>
        <span className={styles.label}>Flight</span>
        <span className={styles.flightWindow}>
          {formatDayMonth(flightStart)} → {formatDayMonth(flightEnd)}
        </span>
      </div>
    </div>
  );
}
