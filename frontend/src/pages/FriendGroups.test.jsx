/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import FriendGroups from './FriendGroups';
import axios from 'axios';

vi.mock('axios');

describe('FriendGroups', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'test-token');
    vi.clearAllMocks();

    axios.get
      .mockResolvedValueOnce({ data: [] }) // friend-groups
      .mockResolvedValueOnce({ data: [{ username: 'alice' }, { username: 'bob' }] }); // friends

    axios.post.mockResolvedValue({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders and can create a group', async () => {
    render(
      <MemoryRouter>
        <FriendGroups />
      </MemoryRouter>
    );

    // Friends loaded into select
    expect(await screen.findByText(/Friend Groups/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/group name/i);
    fireEvent.change(nameInput, { target: { value: 'My Group' } });

    // Submit
    fireEvent.submit(nameInput.closest('form'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/friend-groups/',
        { name: 'My Group', members: [] },
        expect.any(Object)
      );
    });
  });
});
