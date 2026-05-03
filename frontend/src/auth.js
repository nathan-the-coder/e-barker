// Auth state management with JWT
let currentUser = null;
let authCallbacks = [];

// Check if user is logged in on load
const token = sessionStorage.getItem('auth_token');
if (token) {
  fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        currentUser = data.user;
        authCallbacks.forEach(callback => callback(currentUser));
      } else {
        sessionStorage.removeItem('auth_token');
      }
    })
    .catch(() => {
      sessionStorage.removeItem('auth_token');
    });
}

export const onAuthChange = (callback) => {
  authCallbacks.push(callback);
  if (currentUser !== undefined) {
    callback(currentUser);
  }
};

export const login = (user, token) => {
  currentUser = user;
  sessionStorage.setItem('auth_token', token);
  authCallbacks.forEach(callback => callback(currentUser));
};

export const logout = () => {
  currentUser = null;
  sessionStorage.removeItem('auth_token');
  authCallbacks.forEach(callback => callback(null));
};

export { currentUser };
