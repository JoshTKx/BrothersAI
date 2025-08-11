/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import GroupView from './GroupView';

import { vi, afterEach, beforeEach, describe, test, expect } from 'vitest';
vi.mock('axios');

describe('GroupView Component', () => {
  const mockGroupDetails = {
    name: 'Test Group',
    owner: 'user1',
    members: [
      { username: 'user1', email: 'user1@example.com' },
      { username: 'user2', email: 'user2@example.com' },
    ],
  };

  const mockMeetups = [
    { id: 1, title: 'Meetup 1', description: 'Description 1', location: 'Location 1', time: '2025-07-27T10:00:00Z', completed: false },
    { id: 2, title: 'Meetup 2', description: 'Description 2', location: 'Location 2', time: '2025-07-28T10:00:00Z', completed: true },
  ];

  const mockTasks = [
    { id: 1, title: 'Task 1', completed: false },
    { id: 2, title: 'Task 2', completed: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure the component does not redirect to /login during tests
    window.localStorage.setItem('accessToken', 'test-token');

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/friend-groups/')) {
        return Promise.resolve({ data: mockGroupDetails });
      }
      if (url.includes('/api/group-meetups/')) {
        return Promise.resolve({ data: mockMeetups });
      }
      if (url.includes('/api/group-todos/')) {
        return Promise.resolve({ data: mockTasks });
      }
      return Promise.resolve({ data: {} });
    });

    axios.patch.mockResolvedValue({});
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test('renders group details correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Routes>
          <Route path="/friend-groups/:groupId" element={<GroupView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Group Information/i)).toBeInTheDocument();
    // Assert name and owner using partial regex matches
    expect(await screen.findByText(/Name:/i)).toBeInTheDocument();
    expect(await screen.findByText(/Test Group/i)).toBeInTheDocument();
    expect(await screen.findByText(/Owner:/i)).toBeInTheDocument();
    // Members appear in the list
    expect(await screen.findByText(/user1@example.com/i)).toBeInTheDocument();
    expect(await screen.findByText(/user2@example.com/i)).toBeInTheDocument();
  });

  test('renders pending meetups and tasks', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Routes>
          <Route path="/friend-groups/:groupId" element={<GroupView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Meetup 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Meetup 2/i)).not.toBeInTheDocument(); // Completed meetup should not appear
    expect(await screen.findByText(/Task 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Task 2/i)).not.toBeInTheDocument(); // Completed task should not appear
  });

  test('marks meetup as complete', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Routes>
          <Route path="/friend-groups/:groupId" element={<GroupView />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the meetup to appear
    expect(await screen.findByText(/Meetup 1/i)).toBeInTheDocument();

    // Find all 'Mark as Complete' buttons and click the first one (for meetup)
    const completeButtons = screen.getAllByText('Mark as Complete');
    fireEvent.click(completeButtons[0]);

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/group-meetups/1/',
        { completed: true },
        expect.any(Object)
      );
      expect(screen.queryByText(/Meetup 1/i)).not.toBeInTheDocument(); // Meetup should be removed
    });
  });

  test('marks task as complete', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Routes>
          <Route path="/friend-groups/:groupId" element={<GroupView />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the task to appear
    expect(await screen.findByText(/Task 1/i)).toBeInTheDocument();

    // Find all 'Mark as Complete' buttons and click the last one (for task)
    const completeButtons = screen.getAllByText('Mark as Complete');
    fireEvent.click(completeButtons[completeButtons.length - 1]);

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/group-todos/1/',
        { completed: true },
        expect.any(Object)
      );
      expect(screen.queryByText(/Task 1/i)).not.toBeInTheDocument(); // Task should be removed
    });
  });
});