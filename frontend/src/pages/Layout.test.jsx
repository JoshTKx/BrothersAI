/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import Layout from './Layout';
import axios from 'axios';

vi.mock('axios');

function Dummy() { return <div>Dummy</div>; }

describe('Layout', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'a');
    localStorage.setItem('refreshToken', 'b');
    axios.post.mockResolvedValue({});
  });
  afterEach(() => {
    localStorage.clear();
  });

  test('shows taskbar links and logs out', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/home" element={<Dummy />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/BrothersAI/i)).toBeInTheDocument();
    expect(screen.getByText(/Home/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/logout/',
        { refresh: 'b' },
        expect.any(Object)
      );
    });
  });
});
