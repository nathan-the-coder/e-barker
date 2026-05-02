const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Get JWT token from localStorage
const getToken = () => {
  return localStorage.getItem('auth_token');
};

// API request wrapper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  googleLogin: (googleData) => apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify(googleData)
  }),
  getCurrentUser: () => apiRequest('/auth/me')
};

// Queue API
export const queueAPI = {
  getActive: () => apiRequest('/queue/active'),
  getRecent: () => apiRequest('/queue/recent'),
  getMyStatus: (driverId) => apiRequest(`/queue/my-status?driver_id=${driverId}`),
  join: (driverId) => apiRequest('/queue/join', {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId })
  }),
  dispatch: (id) => apiRequest(`/queue/dispatch/${id}`, {
    method: 'POST'
  }),
  complete: (id) => apiRequest(`/queue/complete/${id}`, {
    method: 'POST'
  })
};

// Transactions API
export const transactionAPI = {
  getToday: () => apiRequest('/transactions/today'),
  getByDateRange: (start, end) => apiRequest(`/transactions?start_date=${start}&end_date=${end}`)
};

// Reports API
export const reportsAPI = {
  getQueueStats: (start, end) => apiRequest(`/queue/stats?start_date=${start}&end_date=${end}`)
};

// Settings API
export const settingsAPI = {
  getAll: () => apiRequest('/settings'),
  update: (key, value) => apiRequest(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  })
};

// Users API
export const userAPI = {
  getAll: () => apiRequest('/users'),
  getById: (id) => apiRequest(`/users/${id}`),
  create: (userData) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  update: (id, userData) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),
  delete: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
  }),
  getDrivers: () => apiRequest('/users/drivers/list')
};

// Tricycles API
export const vehicleAPI = {
  getAll: () => apiRequest('/vehicles'),
  getAvailable: () => apiRequest('/vehicles/available'),
  getById: (id) => apiRequest(`/vehicles/${id}`),
  create: (data) => apiRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiRequest(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiRequest(`/vehicles/${id}`, {
    method: 'DELETE'
  }),
  assign: (id, driverId) => apiRequest(`/vehicles/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId })
  })
};
