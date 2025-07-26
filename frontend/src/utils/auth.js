// auth.js
const baseURL = 'http://127.0.0.1:8000/';

export async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`${baseURL}api/token/refresh/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
        throw new Error('Token refresh failed');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.access);
    return data.access;
}

export async function fetchWithToken(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    // First try with current access token
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            // Token might be expired, try to refresh
            const newToken = await refreshToken();
            
            // Retry the request with new token
            const retryResponse = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                },
            });

            if (!retryResponse.ok) {
                throw new Error('Request failed after token refresh');
            }

            return retryResponse;
        }

        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}
