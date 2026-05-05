import { getTrafficData } from "../maps";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiRequest = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem("auth_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Response:", text);
      throw new Error(
        `Server returned HTML instead of JSON. Check VITE_API_URL setting. Response: ${text.substring(0, 100)}`,
      );
    }

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (userData) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),
  login: (credentials) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  googleLogin: (googleData) =>
    apiRequest("/auth/google", {
      method: "POST",
      body: JSON.stringify(googleData),
    }),
  getCurrentUser: () => apiRequest("/auth/me"),
};

// ─── Queue ───────────────────────────────────────────────────────────────────
export const queueAPI = {
  getActive: () => apiRequest("/queue/active"),
  getRecent: () => apiRequest("/queue/recent"),
  getMyStatus: (driverId) => apiRequest(`/queue/my-status?driver_id=${driverId}`),
  join: (driverId, vehicleId) =>
    apiRequest("/queue/join", {
      method: "POST",
      body: JSON.stringify({ driver_id: driverId, vehicle_id: vehicleId || undefined }),
    }),
  dispatch: (id, opts = {}) =>
    apiRequest(`/queue/dispatch/${id}`, {
      method: "POST",
      body: JSON.stringify({
        estimated_time_minutes: opts.estimatedMinutes || null,
        route_origin: opts.origin || null,
        route_destination: opts.destination || null,
        route_polyline: opts.polyline || null,
        distance_km: opts.distanceKm || null,
      }),
    }),
  confirm: (id, routeTaken) =>
    apiRequest(`/queue/confirm/${id}`, {
      method: "POST",
      body: JSON.stringify({ route_taken: routeTaken || null }),
    }),
  updateLocation: (id, lat, lng) =>
    apiRequest(`/queue/location/${id}`, {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),
  complete: (id) =>
    apiRequest(`/queue/complete/${id}`, {
      method: "POST",
    }),
  registerTrip: (driverId, vehicleId) =>
    apiRequest("/queue/register-trip", {
      method: "POST",
      body: JSON.stringify({ driver_id: driverId, vehicle_id: vehicleId || undefined }),
    }),
  getDrivers: () => apiRequest("/users/drivers/list"),
  getTraffic: (origin, destination) => getTrafficData(origin, destination),
  getTracking: () => apiRequest("/queue/tracking"),
  getMyTrips: (driverId, start, end) =>
    apiRequest(`/queue/my-trips?driver_id=${driverId}&start=${start || ''}&end=${end || ''}`),
  getMyRoute: (driverId) => apiRequest(`/queue/my-route?driver_id=${driverId}`),
  getPending: () => apiRequest("/queue/pending"),
  recordTrip: (id, regularCount, seniorStudentCount, addToQueue) =>
    apiRequest(`/queue/record-trip/${id}`, {
      method: "POST",
      body: JSON.stringify({ 
        regular_count: regularCount,
        senior_student_count: seniorStudentCount,
        add_to_queue: addToQueue
      }),
    }),
  getRecordedTrips: (startDate, endDate, driverId) => {
    let url = "/queue/recorded-trips?";
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (driverId) params.push(`driver_id=${driverId}`);
    return apiRequest(url + params.join("&"));
  },
};

// ─── Transactions ────────────────────────────────────────────────────────────
export const transactionAPI = {
  getToday: () => apiRequest("/transactions/today"),
  getByDateRange: (start, end) => apiRequest(`/transactions/range?start=${start}&end=${end}`),
};

// ─── Fares ───────────────────────────────────────────────────────────────────
export const fareAPI = {
  getMatrix: () => apiRequest("/fares/matrix"),
  calculate: (distanceKm, passengers = 1) =>
    apiRequest(`/fares/calculate?distance_km=${distanceKm}&passengers=${passengers}`),
  getRoute: (origin, destination, passengers = 1) =>
    apiRequest(
      `/fares/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&passengers=${passengers}`,
    ),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsAPI = {
  getAll: () => apiRequest("/settings"),
  update: (key, value) =>
    apiRequest(`/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value: String(value) }),
    }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll: () => apiRequest("/users"),
};

// ─── Vehicles ───────────────────────────────────────────────────────────────
export const vehicleAPI = {
  getAll: () => apiRequest("/vehicles"),
};
