/// <reference types="vitest" />
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import SharedTimetables from './SharedTimetables';

const originalFetch = global.fetch;

describe('SharedTimetables', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  test('renders list from API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shared: [
          { id: 1, owner: 'alice', created_at: new Date().toISOString(), timetable_data: {} },
        ],
      }),
    });

    render(<SharedTimetables />);

    expect(await screen.findByText(/Timetables Shared With Me/i)).toBeInTheDocument();
    expect(await screen.findByText(/alice/i)).toBeInTheDocument();
  });
});
