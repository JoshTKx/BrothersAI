/// <reference types="vitest" />
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import Home from './Home';
import axios from 'axios';

vi.mock('axios');

describe('Home page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
    vi.clearAllMocks();

    axios.get
      .mockResolvedValueOnce({ data: { username: 'jane', email: 'jane@example.com' } }) // /api/user/
  .mockResolvedValueOnce({ data: { timetable_data: {} } }) // /timetableapi/timetable/my-timetable/
  .mockResolvedValueOnce({ data: [] }); // /api/todos/
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders welcome for logged in user', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

  expect(await screen.findByText(/Welcome, /i)).toBeInTheDocument();
  // Check the highlighted username specifically
  expect(screen.getByText('jane', { selector: 'span' })).toBeInTheDocument();
  });
});
