import Swal from 'sweetalert2';
import { onAuthChange, logout, currentUser } from './auth.js';
import { queueAPI, transactionAPI } from './api.js';

let dispatcherId = null;

// Check auth state
onAuthChange(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Check if user is a dispatcher
  if (user.role !== 'dispatcher') {
    window.location.href = '/driver.html';
    return;
  }

  dispatcherId = user.id;
  document.getElementById('user-display').textContent = `Dispatcher: ${user.name || user.email}`;

  // Load initial data
  loadActiveQueue();
  loadRecentDispatches();
  loadTodayStats();
  setInterval(() => {
    loadActiveQueue();
    loadRecentDispatches();
  }, 10000); // Refresh every 10 seconds
});

// Load active queue (FIFO)
async function loadActiveQueue() {
  try {
    const data = await queueAPI.getActive();
    const queueContainer = document.querySelector('.col-md-8');

    if (!queueContainer) return;

    if (data.queue.length === 0) {
      queueContainer.innerHTML = `
        <h4 class="mb-3">Active Queue (FIFO)</h4>
        <p class="text-center text-muted">No drivers in queue</p>
      `;
      return;
    }

    // Build queue HTML
    let queueHTML = '<h4 class="mb-3">Active Queue (FIFO)</h4>';

    // Next in line
    if (data.queue.length > 0) {
      const next = data.queue[0];
      queueHTML += `
        <div class="card queue-card next-in-line shadow mb-3">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <span class="badge bg-success text-white mb-1">NEXT IN LINE</span>
              <h5 class="mb-0">Body #: ${next.driver_id}</h5>
              <small class="text-muted">Driver: ${next.driver_name || 'Unknown'}</small>
            </div>
            <div class="text-end">
              <small class="d-block text-muted">Checked in: ${new Date(next.check_in_time).toLocaleTimeString()}</small>
              <button class="btn btn-primary mt-2 dispatch-btn" data-id="${next.id}">DISPATCH NOW</button>
            </div>
          </div>
        </div>
      `;
    }

    // Rest of queue
    data.queue.slice(1).forEach(entry => {
      const inQueueMins = Math.floor((new Date() - new Date(entry.check_in_time)) / 60000);
      queueHTML += `
        <div class="card queue-card shadow-sm mb-2">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">Body #: ${entry.driver_id}</h6>
              <small class="text-muted">Driver: ${entry.driver_name || 'Unknown'}</small>
            </div>
            <small class="text-muted">In Queue: ${inQueueMins} mins</small>
          </div>
        </div>
      `;
    });

    queueHTML += '<p class="text-center text-muted mt-3 small">Showing ' + data.queue.length + ' drivers currently at terminal</p>';
    queueContainer.innerHTML = queueHTML;

    // Add dispatch button listeners
    document.querySelectorAll('.dispatch-btn').forEach(btn => {
      btn.addEventListener('click', () => dispatchDriver(btn.dataset.id));
    });
  } catch (error) {
    console.error('Error loading active queue:', error);
  }
}

// Load recently dispatched (on-trip)
async function loadRecentDispatches() {
  try {
    const data = await queueAPI.getRecent();
    const container = document.getElementById('recent-dispatches');

    if (!container) return;

    if (data.queue.length === 0) {
      container.innerHTML = '<p class="text-center text-muted p-3">No recent dispatches</p>';
      return;
    }

    container.innerHTML = data.queue.map(entry => `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${entry.driver_name || 'Driver #' + entry.driver_id}</strong>
            <br><small class="text-muted">Body #: ${entry.driver_id}</small>
          </div>
          <small class="text-muted">${entry.dispatch_time ? new Date(entry.dispatch_time).toLocaleTimeString() : 'N/A'}</small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading recent dispatches:', error);
  }
}

// Load today's stats
async function loadTodayStats() {
  try {
    const data = await transactionAPI.getToday();
    const statsCard = document.querySelector('.stats-card h2');
    if (statsCard) {
      statsCard.textContent = `₱ ${parseFloat(data.total).toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error loading today stats:', error);
  }
}

// Dispatch driver
async function dispatchDriver(queueId) {
  const result = await Swal.fire({
    title: 'Dispatch driver?',
    text: 'Dispatch this driver now?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, dispatch',
    cancelButtonText: 'Cancel'
  });
  if (!result.isConfirmed) return;

  try {
    await queueAPI.dispatch(queueId);
    Swal.fire({
      title: 'Success!',
      text: 'Driver dispatched successfully!',
      icon: 'success',
      confirmButtonText: 'Ok'
    });
    loadActiveQueue();
    loadTodayStats();
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: error.message || 'Failed to dispatch driver',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
  }
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  logout();
  window.location.href = '/';
});

// Register New Trip button
document.querySelector('.btn-success')?.addEventListener('click', () => {
  Swal.fire({ title: 'Info', text: 'Register New Trip functionality - to be implemented', icon: 'info', confirmButtonText: 'Ok' });
});

// View Full Log button
document.querySelector('.btn-outline-primary')?.addEventListener('click', () => {
  Swal.fire({ title: 'Info', text: 'View Full Log functionality - to be implemented', icon: 'info', confirmButtonText: 'Ok' });
});
