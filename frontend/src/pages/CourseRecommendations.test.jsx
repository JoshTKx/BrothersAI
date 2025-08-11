/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import CourseRecommendations from './CourseRecommendations';

describe('CourseRecommendations', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('disables button when no completed courses', () => {
    render(<CourseRecommendations completedCourses={[]} />);
    const btn = screen.getByRole('button', { name: /get ai recommendations/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/course recommendations/i)).toBeInTheDocument();
  });

  test('fetches and renders recommendations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recommendations: [
          {
            module_code: 'CS2100',
            module_name: 'Computer Organisation',
            rationale: 'Builds on your completed modules.',
            prerequisites: 'CS1010',
            suggested_semester: 'Y2S1',
          },
        ],
      }),
    });

    render(<CourseRecommendations completedCourses={['CS1010']} />);

    const btn = screen.getByRole('button', { name: /get ai recommendations/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);

    expect(await screen.findByText('CS2100')).toBeInTheDocument();
    expect(screen.getByText(/computer organisation/i)).toBeInTheDocument();
    expect(screen.getByText(/builds on your completed modules/i)).toBeInTheDocument();
  });

  test('shows error on failed request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<CourseRecommendations completedCourses={['CS1010']} />);
    fireEvent.click(screen.getByRole('button', { name: /get ai recommendations/i }));

    expect(await screen.findByText(/failed to get recommendations/i)).toBeInTheDocument();
  });
});
