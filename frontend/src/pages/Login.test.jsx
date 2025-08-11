/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import Login from './Login';
import axios from 'axios';

vi.mock('axios');

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: { tokens: { access: 'a', refresh: 'b' } } });
  });
  afterEach(() => {
    localStorage.clear();
  });

  test('submits and navigates on success', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/login/',
        { email: 'u@example.com', password: 'pw' },
        expect.any(Object)
      );
      expect(localStorage.getItem('accessToken')).toBe('a');
      expect(localStorage.getItem('refreshToken')).toBe('b');
      expect(screen.getByText(/home page/i)).toBeInTheDocument();
    });
  });
});
