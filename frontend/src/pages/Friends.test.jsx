/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'
import axios from 'axios'
import Friends from './Friends'

vi.mock('axios')

describe('Friends Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  test('renders friends, received and sent requests', async () => {
    const initialFriendRequests = {
      received: [
        { id: 1, from_user_email: 'alice@example.com', status: 'pending' },
      ],
      sent: [
        { id: 2, to_user_email: 'bob@example.com', status: 'pending' },
      ],
    }
    const initialUser = {
      friends: [
        { id: 3, username: 'charlie', email: 'charlie@example.com' },
      ],
    }

    axios.get
      .mockResolvedValueOnce({ data: initialFriendRequests }) // /friend-requests
      .mockResolvedValueOnce({ data: initialUser }) // /user

    render(
      <MemoryRouter initialEntries={['/friends']}>
        <Friends />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Friends/i)).toBeInTheDocument()
    expect(await screen.findByText(/charlie/i)).toBeInTheDocument()

    expect(await screen.findByText(/Received Friend Requests/i)).toBeInTheDocument()
    expect(await screen.findByText(/alice@example.com/i)).toBeInTheDocument()

    expect(await screen.findByText(/Sent Friend Requests/i)).toBeInTheDocument()
    expect(await screen.findByText(/bob@example.com/i)).toBeInTheDocument()
  })

  test('shows empty messages when there is no data', async () => {
    const emptyFriendRequests = { received: [], sent: [] }
    const emptyUser = { friends: [] }

    axios.get
      .mockResolvedValueOnce({ data: emptyFriendRequests })
      .mockResolvedValueOnce({ data: emptyUser })

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>
    )

    expect(await screen.findByText(/No friends yet/i)).toBeInTheDocument()
    expect(await screen.findByText(/No received requests/i)).toBeInTheDocument()
    expect(await screen.findByText(/No sent requests/i)).toBeInTheDocument()
  })

  test('accepting a request posts to API and refreshes lists', async () => {
    const initialFriendRequests = {
      received: [
        { id: 10, from_user_email: 'dana@example.com', status: 'pending' },
      ],
      sent: [],
    }
    const initialUser = { friends: [] }
    const updatedFriendRequests = { received: [], sent: [] }
    const updatedUser = { friends: [{ id: 99, username: 'dana', email: 'dana@example.com' }] }

    // Order of calls: GET friend-requests, GET user, POST respond, GET friend-requests, GET user
    axios.get
      .mockResolvedValueOnce({ data: initialFriendRequests })
      .mockResolvedValueOnce({ data: initialUser })
      .mockResolvedValueOnce({ data: updatedFriendRequests })
      .mockResolvedValueOnce({ data: updatedUser })

    axios.post.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>
    )

    // Wait initial content
    expect(await screen.findByText(/dana@example.com/i)).toBeInTheDocument()

    // Click Accept
    const acceptBtn = screen.getByRole('button', { name: /accept/i })
    fireEvent.click(acceptBtn)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/friend-request/10/respond/',
        { action: 'accept' },
        expect.any(Object)
      )
      // After update, dana should now be in friends and not in received
      expect(screen.queryByText(/dana@example.com/i)).not.toBeInTheDocument()
      expect(screen.getByText(/dana/i)).toBeInTheDocument()
    })
  })

  test('sending a friend request posts to API and clears input', async () => {
    const initialFriendRequests = { received: [], sent: [] }
    const initialUser = { friends: [] }

    axios.get
      .mockResolvedValueOnce({ data: initialFriendRequests })
      .mockResolvedValueOnce({ data: initialUser })

    axios.post.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>
    )

    const emailInput = await screen.findByPlaceholderText(/Enter email to add friend/i)
    const submitBtn = screen.getByRole('button', { name: /add friend/i })

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/friend-request/',
        { to_email: 'new@example.com' },
        expect.any(Object)
      )
      expect(emailInput).toHaveValue('')
      expect(screen.getByRole('button', { name: /add friend/i })).toBeEnabled()
    })
  })
})
