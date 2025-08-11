/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import CompletedCourses from './CompletedCourses';

vi.mock('../utils/auth', () => {
  return {
    fetchWithToken: vi.fn(),
  };
});

import { fetchWithToken } from '../utils/auth';

describe('CompletedCourses page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders and loads courses', async () => {
    fetchWithToken.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ courses: [
        { id: 1, module_code: 'CS1010', academic_year: 'AY23/24', semester: '1', grade: 'A' },
      ] }),
    });

    render(
      <MemoryRouter initialEntries={['/completed-courses']}>
        <Routes>
          <Route path="/completed-courses" element={<CompletedCourses />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Completed Courses/i)).toBeInTheDocument();
    expect(await screen.findByText('CS1010')).toBeInTheDocument();
  });

  test('fetches recommendations when button clicked', async () => {
    // First call: load courses
    fetchWithToken
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courses: [
          { id: 1, module_code: 'CS1010', academic_year: 'AY23/24', semester: '1', grade: 'A' },
        ] }),
      })
      // Second call: recommendations
      .mockResolvedValueOnce({
        ok: true,
  // Provide minimal Headers-like object to satisfy headers.entries() usage
  headers: { entries: () => [] },
        json: async () => ({ recommendations: [
          { module_code: 'CS2100', module_name: 'Computer Organisation', rationale: 'Good next step', prerequisites: 'CS1010', suggested_semester: 'Y2S1' },
        ] }),
      });

    render(
      <MemoryRouter>
        <CompletedCourses />
      </MemoryRouter>
    );

    // Wait for initial course load
    await screen.findByText('CS1010');

    const btn = screen.getByRole('button', { name: /get ai course recommendations/i });
    fireEvent.click(btn);

    expect(await screen.findByText('CS2100')).toBeInTheDocument();
    expect(screen.getByText(/Computer Organisation/i)).toBeInTheDocument();
  });
});
