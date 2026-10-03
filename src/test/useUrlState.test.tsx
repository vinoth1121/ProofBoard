import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useCampaignFilters } from '../features/campaigns/useCampaignFilters';
import { useUrlState } from '../hooks/useUrlState';
import { parseFilters, serializeFilters } from '../lib/filters';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderInRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <TestHarness />
    </MemoryRouter>,
  );
}

function TestHarness() {
  const url = useUrlState(parseFilters, serializeFilters);
  return (
    <div>
      <output data-testid="query">{url.value.query}</output>
      <output data-testid="status">{url.value.status}</output>
      <output data-testid="page">{url.value.page}</output>
      <button type="button" onClick={() => url.set({ status: 'live' })}>
        set live
      </button>
      <button type="button" onClick={() => url.set({ query: 'rail', page: 3 }, { replace: true })}>
        set rail
      </button>
      <button type="button" onClick={() => url.reset()}>
        reset
      </button>
    </div>
  );
}

function FiltersHarness() {
  const controller = useCampaignFilters();
  return (
    <div>
      <input
        aria-label="Search"
        value={controller.searchDraft}
        onChange={(event) => controller.onSearchChange(event.target.value)}
      />
      <output data-testid="draft">{controller.searchDraft}</output>
      <output data-testid="filters-status">{controller.filters.status}</output>
      <output data-testid="filters-page">{controller.filters.page}</output>
      <button type="button" onClick={() => controller.setStatus('ended')}>
        ended
      </button>
      <button type="button" onClick={controller.resetAll}>
        reset
      </button>
    </div>
  );
}

function renderFilters(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <FiltersHarness />
    </MemoryRouter>,
  );
}

describe('useUrlState', () => {
  it('hydrates filter state from the query string', () => {
    renderInRouter('/campaigns?query=rail&status=live&page=4');
    expect(screen.getByTestId('query')).toHaveTextContent('rail');
    expect(screen.getByTestId('status')).toHaveTextContent('live');
    expect(screen.getByTestId('page')).toHaveTextContent('4');
  });

  it('defaults everything when the URL is bare', () => {
    renderInRouter('/campaigns');
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('status')).toHaveTextContent('all');
    expect(screen.getByTestId('page')).toHaveTextContent('1');
  });

  it('writes state back to the URL and leaves other keys alone', async () => {
    const user = userEvent.setup();
    renderInRouter('/campaigns?query=rail');

    await user.click(screen.getByRole('button', { name: 'set live' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?query=rail&status=live');
  });

  it('clears the query string on reset', async () => {
    const user = userEvent.setup();
    renderInRouter('/campaigns?query=rail&status=live&page=3');

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns');
  });
});

describe('useCampaignFilters', () => {
  it('debounces search commits into the URL and resets pagination', async () => {
    renderFilters('/campaigns?page=5');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'rail' } });

    // Typing must not spam the URL: the commit is debounced.
    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?page=5');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?query=rail'),
    );
    expect(screen.getByTestId('filters-page')).toHaveTextContent('1');
  });

  it('keeps the input responsive before the debounce fires', async () => {
    renderFilters('/campaigns');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ab' } });

    expect(screen.getByTestId('draft')).toHaveTextContent('ab');
    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns');
  });

  it('reflects a shared URL into the search box', () => {
    renderFilters('/campaigns?query=kestrel');
    expect(screen.getByLabelText('Search')).toHaveValue('kestrel');
  });

  it('resets to page 1 when the status filter changes', async () => {
    const user = userEvent.setup();
    renderFilters('/campaigns?page=3');

    await user.click(screen.getByRole('button', { name: 'ended' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/campaigns?status=ended');
    expect(screen.getByTestId('filters-status')).toHaveTextContent('ended');
  });
});
