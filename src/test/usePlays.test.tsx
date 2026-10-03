import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { usePlays } from '../hooks/usePlays';
import { server } from '../mocks/server';

function Harness({ campaignId }: { campaignId: string }) {
  const plays = usePlays({ campaignId, from: null, to: null });
  const [firstId, setFirstId] = useState<string | null>(null);
  const items = plays.data?.items ?? [];

  if (items.length > 0 && firstId === null && items[0] !== undefined) setFirstId(items[0].id);

  return (
    <div>
      <output data-testid="status">{plays.status}</output>
      <output data-testid="total">{items.length}</output>
      <output data-testid="flagged">{items.filter((p) => p.status === 'flagged').length}</output>
      <output data-testid="pending">{[...plays.pendingFlags].join(',')}</output>
      <output data-testid="flagError">{[...plays.flagErrors.values()].join('|')}</output>
      <output data-testid="statsFlagged">{plays.data?.stats.flagged ?? -1}</output>
      <output data-testid="error">
        {plays.error === null
          ? ''
          : `${plays.error.code}:${plays.error.status}:${plays.error.message}`}
      </output>
      <button
        type="button"
        disabled={firstId === null}
        onClick={() => {
          if (firstId !== null) plays.flagPlay(firstId);
        }}
      >
        Flag first play
      </button>
    </div>
  );
}

describe('usePlays optimistic flagging', () => {
  it('paints the flag immediately, before the write comes back', async () => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.post('/api/campaigns/:id/flag-play', async () => {
        await held;
        return HttpResponse.json(
          { playId: 'x', status: 'flagged', flaggedAt: new Date().toISOString() },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<Harness campaignId="c-010" />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    const flaggedBefore = Number(screen.getByTestId('flagged').textContent);

    await user.click(screen.getByRole('button', { name: 'Flag first play' }));

    // Optimistic: the row is already flagged while the POST is still in flight.
    expect(Number(screen.getByTestId('flagged').textContent)).toBe(flaggedBefore + 1);
    expect(screen.getByTestId('pending').textContent).not.toBe('');

    release?.();

    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe(''));
    expect(Number(screen.getByTestId('flagged').textContent)).toBe(flaggedBefore + 1);
  });

  it('rolls the optimistic change back when the registry rejects the write', async () => {
    server.use(
      http.post('/api/campaigns/:id/flag-play', () =>
        HttpResponse.json(
          { error: 'write_conflict', message: 'Screen registry rejected the flag.' },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<Harness campaignId="c-013" />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    const flaggedBefore = Number(screen.getByTestId('flagged').textContent);
    expect(screen.getByTestId('flagError')).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'Flag first play' }));

    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe(''));

    // Rolled back to the server state…
    expect(Number(screen.getByTestId('flagged').textContent)).toBe(flaggedBefore);
    // …and the reason is surfaced rather than swallowed.
    expect(screen.getByTestId('flagError')).toHaveTextContent('Screen registry rejected the flag.');
  });

  it('surfaces a failed plays fetch through the same error surface', async () => {
    server.use(
      http.get('/api/campaigns/:id/plays', () =>
        HttpResponse.json(
          { error: 'internal_error', message: 'Registry timed out.' },
          { status: 500 },
        ),
      ),
    );

    render(<Harness campaignId="c-009" />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });
});
