import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import axios from 'axios';
import GroupView from './GroupView';

jest.mock('axios');

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
    });

    axios.patch.mockResolvedValue({});
  });

  test('renders group details correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Route path="/friend-groups/:groupId">
          <GroupView />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Group Information')).toBeInTheDocument();
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('Owner: user1')).toBeInTheDocument();
      expect(screen.getByText('user1 (user1@example.com)')).toBeInTheDocument();
      expect(screen.getByText('user2 (user2@example.com)')).toBeInTheDocument();
    });
  });

  test('renders pending meetups and tasks', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Route path="/friend-groups/:groupId">
          <GroupView />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Meetup 1')).toBeInTheDocument();
      expect(screen.queryByText('Meetup 2')).not.toBeInTheDocument(); // Completed meetup should not appear
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument(); // Completed task should not appear
    });
  });

  test('marks meetup as complete', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Route path="/friend-groups/:groupId">
          <GroupView />
        </Route>
      </MemoryRouter>
    );

    const completeButton = await screen.findByText('Mark as Complete');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/group-meetups/1/',
        { completed: true },
        expect.any(Object)
      );
      expect(screen.queryByText('Meetup 1')).not.toBeInTheDocument(); // Meetup should be removed
    });
  });

  test('marks task as complete', async () => {
    render(
      <MemoryRouter initialEntries={['/friend-groups/1']}>
        <Route path="/friend-groups/:groupId">
          <GroupView />
        </Route>
      </MemoryRouter>
    );

    const completeButton = await screen.findByText('Mark as Complete');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/group-todos/1/',
        { completed: true },
        expect.any(Object)
      );
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument(); // Task should be removed
    });
  });
});