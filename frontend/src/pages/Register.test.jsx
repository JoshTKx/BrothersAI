/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import Register from './Register';
import axios from 'axios';

vi.mock('axios');

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: {} });
  });

  test('submits and navigates to login on success', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'u@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pw1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'pw1' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/register/',
        { username: 'user', email: 'u@example.com', password1: 'pw1', password2: 'pw1' }
      );
      expect(screen.getByText(/login page/i)).toBeInTheDocument();
    });
  });
});
