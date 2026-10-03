import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { server } from '../mocks/server';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderApp(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <App />
    </MemoryRouter>,
  );
}

describe('campaign index route', () => {
  /** The grid is mounted once the paginator reports the full page count. */
  const waitForGrid = () => screen.findByRole('navigation', { name: 'Campaign list pages' });

  it('shows a skeleton first, then the campaign grid', async () => {
    const { container } = renderApp('/campaigns');

    // First paint is the loading state.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);

    await waitForGrid();

    expect(screen.getByRole('heading', { name: 'Campaign index' })).toBeInTheDocument();
    expect(screen.getByTestId('result-summary')).toHaveTextContent('of 24 matching');
    expect(screen.getAllByRole('link', { name: /OOH —/ }).length).toBeGreaterThan(0);
  });

  it('applies a status filter from the URL on first paint and updates the URL on click', async () => {
    const user = userEvent.setup();
    renderApp('/campaigns?status=ended');

    await waitForGrid();

    const endedButton = screen.getByRole('button', { name: /^ended/i });
    expect(endedButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^live/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?status=live');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^live/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('paginates and reflects the page in the URL', async () => {
    const user = userEvent.setup();
    renderApp('/campaigns');

    await waitForGrid();

    await user.click(screen.getByRole('button', { name: 'Page 2 of 4' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?page=2');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Page 2 of 4' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
  });

  it('searches from the URL and shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderApp('/campaigns');

    await waitForGrid();

    await user.type(screen.getByLabelText('Search'), 'zzzz-no-such-campaign');

    await waitFor(
      () => expect(screen.getByText('No campaigns match this filter')).toBeInTheDocument(),
      {
        timeout: 3000,
      },
    );
  });

  it('offers a retry button when the list request fails', async () => {
    let attempts = 0;
    server.use(
      http.get('/api/campaigns', () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Index unavailable.' },
            { status: 500 },
          );
        }
        return HttpResponse.json(
          {
            items: [],
            page: 1,
            pageSize: 6,
            total: 0,
            totalPages: 1,
            facets: {
              cities: [],
              statuses: ['live', 'scheduled', 'ended'],
              statusCounts: { live: 0, scheduled: 0, ended: 0 },
              totalCampaigns: 0,
            },
          },
          { status: 200 },
        );
      }),
    );

    const user = userEvent.setup();
    renderApp('/campaigns');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Campaign index unavailable'),
    );

    await user.click(screen.getByRole('button', { name: /retry request/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(attempts).toBeGreaterThanOrEqual(2);
  });
});

describe('campaign detail route (lazy chunk)', () => {
  it('renders stats, the film strip and the play log for a deep link', async () => {
    renderApp('/campaigns/c-007');

    expect(
      await screen.findByText('Proof-of-play timeline', {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(screen.getByText('Plays delivered')).toBeInTheDocument();
    expect(screen.getByText('Shortfall')).toBeInTheDocument();
    expect(screen.getByText('Completion')).toBeInTheDocument();

    const frames = await screen.findAllByRole('button', { name: /^Frame \d+ of \d+\./ });
    expect(frames.length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Played at' })).toBeInTheDocument();
  });

  it('opens the proof modal, traps focus, steps frames with arrow keys and closes on Escape', async () => {
    const user = userEvent.setup();
    renderApp('/campaigns/c-007');

    await screen.findByText('Proof-of-play timeline', {}, { timeout: 3000 });
    const firstFrame = (await screen.findAllByRole('button', { name: /^Frame \d+ of \d+\./ }))[0];
    expect(firstFrame).toBeDefined();
    if (firstFrame === undefined) return;
    await user.click(firstFrame);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(/^Frame 1 of \d+$/)).toBeInTheDocument();

    // Arrow keys walk the timeline without leaving the dialog.
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(within(dialog).getByText(/^Frame 2 of \d+$/)).toBeInTheDocument());

    // Focus stays inside the dialog.
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('draws a not-found sheet for an unknown campaign id', async () => {
    renderApp('/campaigns/c-999');

    await waitFor(() => expect(screen.getByText(/No campaign/)).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.getByRole('link', { name: /campaign index/i })).toBeInTheDocument();
  });
});

describe('unknown route', () => {
  it('renders the 404 sheet and still offers a way back', async () => {
    renderApp('/not-a-real-sheet');
    expect(await screen.findByText('This sheet is not in the drawing set')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /campaign index/i })).toBeInTheDocument();
  });
});
