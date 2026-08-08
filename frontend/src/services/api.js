const API_BASE_URL = 'http://localhost:8000/api/v1';

// Get access token from local storage
export const getToken = () => localStorage.getItem('access_token');
export const saveToken = (token) => localStorage.setItem('access_token', token);
export const clearToken = () => localStorage.removeItem('access_token');

// Utility to perform fetch requests
async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    if (data && data.detail) {
      if (Array.isArray(data.detail)) {
        const errorMessages = data.detail.map(err => {
          const field = err.loc ? err.loc[err.loc.length - 1] : 'error';
          return `${field}: ${err.msg}`;
        }).join(', ');
        throw new Error(errorMessages);
      }
      throw new Error(data.detail);
    }
    throw new Error('Something went wrong');
  }

  return data;
}

export const api = {
  // --- AUTH ENDPOINTS ---
  register: (username, email, password, preferred_language) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, preferred_language }),
    }),

  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.access_token) {
      saveToken(data.access_token);
    }
    return data;
  },

  getMe: () => request('/auth/me'),

  updatePreferredLanguage: (preferred_language) =>
    request('/auth/me/language', {
      method: 'PUT',
      body: JSON.stringify({ preferred_language }),
    }),

  getNotifications: () => request('/auth/notifications'),

  // --- CONTACTS ENDPOINTS ---
  getContacts: () => request('/contacts'),

  addContact: (contact_username, nickname) =>
    request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact_username, nickname }),
    }),

  respondToContact: (contactId, status) =>
    request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }), // 'accepted' or 'rejected'
    }),

  deleteContact: (contactId) =>
    request(`/contacts/${contactId}`, {
      method: 'DELETE',
    }),

  // --- CALLS ENDPOINTS ---
  initiateCall: (receiver_username) =>
    request('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ receiver_username }),
    }),

  acceptCall: (callId) =>
    request(`/calls/${callId}/accept`, {
      method: 'POST',
    }),

  rejectCall: (callId) =>
    request(`/calls/${callId}/reject`, {
      method: 'POST',
    }),

  endCall: (callId) =>
    request(`/calls/${callId}/end`, {
      method: 'POST',
    }),

  getRecentCalls: () => request('/calls/recent'),

  getCallHistory: (callId) => request(`/calls/${callId}/history`),
};
