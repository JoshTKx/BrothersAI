/// <reference types="vitest" />
import { render, screen } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import Timetable from './timetable';
import axiosInstance from '../utils/axiosConfig';

vi.mock('../utils/axiosConfig', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

describe('timetable page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders base UI', () => {
    const { container } = render(<Timetable />);
    expect(container).toBeInTheDocument();
  });
});
