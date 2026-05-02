import { onAuthChange, logout, currentUser } from './auth.js';

// Check auth state on landing page
onAuthChange((user) => {
  const loginBtn = document.querySelector('a[href="/login.html"]');
  if (user) {
    // User is signed in, update UI
    if (loginBtn) {
      const dest = user.role === 'dispatcher' ? '/dispatcher_dashboard.html' : '/driver.html';
      loginBtn.textContent = 'Dashboard';
      loginBtn.href = dest;
      loginBtn.classList.remove('btn-light');
      loginBtn.classList.add('btn-outline-light');
    }
    // Add logout button if not present
    const nav = document.querySelector('.navbar-nav');
    if (nav && !document.getElementById('logout-btn')) {
      const logoutLi = document.createElement('li');
      logoutLi.className = 'nav-item';
      logoutLi.innerHTML = '<button id="logout-btn" class="btn btn-outline-light ms-2">Logout</button>';
      nav.appendChild(logoutLi);
      document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
        window.location.reload();
      });
    }
  } else {
    // User not signed in
    if (loginBtn) {
      loginBtn.textContent = 'Login';
      loginBtn.href = '/login.html';
      loginBtn.classList.remove('btn-outline-light');
      loginBtn.classList.add('btn-light');
    }
  }
});
