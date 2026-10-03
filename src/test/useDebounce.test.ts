import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits the first value immediately so a URL-provided query renders at once', () => {
    const { result } = renderHook(() => useDebounce('rail', 300));
    expect(result.current).toBe('rail');
  });

  it('withholds a changed value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ra' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ra');
  });

  it('collapses a burst of keystrokes into a single settled value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: '' },
    });

    for (const value of ['a', 'ap', 'ape', 'apex', 'apex r']) {
      rerender({ value });
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('apex r');
  });

  it('does not restart the timer when the value is unchanged', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'a' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('a');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once with the most recent arguments', () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 200));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    expect(spy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('third');
  });

  it('always calls the latest callback, never a stale closure', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 200), {
      initialProps: { fn: first },
    });

    act(() => {
      result.current('x');
    });
    rerender({ fn: second });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('x');
  });
});
