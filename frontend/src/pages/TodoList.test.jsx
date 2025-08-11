/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import TodoList from './TodoList';
import axios from 'axios';

vi.mock('axios');

describe('TodoList', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'token');
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: { id: 1, title: 'Task', completed: false } });
    axios.patch.mockResolvedValue({});
    axios.delete.mockResolvedValue({});
  });
  afterEach(() => {
    localStorage.clear();
  });

  test('adds a todo', async () => {
    render(<TodoList />);

    const input = await screen.findByPlaceholderText(/add a new task/i);
    fireEvent.change(input, { target: { value: 'Task' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText('Task')).toBeInTheDocument();
  });
});
