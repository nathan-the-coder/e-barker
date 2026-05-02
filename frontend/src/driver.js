import Swal from 'sweetalert2';
import { onAuthChange, logout, currentUser } from './auth.js';
import { queueAPI } from './api.js';

let driverId = null;

// Check auth state
onAuthChange(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Check if user is a driver
  if (user.role !== 'driver') {
    window.location.href = '/dispatcher_dashboard.html';
    return;
  }

  driverId = user.id;
  document.getElementById('user-display').textContent = `Driver: ${user.name || user.email}`;

  // Load initial data
  loadQueueStatus();
  loadActiveQueue();
  setInterval(() => {
    loadQueueStatus();
    loadActiveQueue();
  }, 30000); // Refresh every 30 seconds
});

// Load driver's queue status
async function loadQueueStatus() {
  if (!driverId) return;

  try {
    const status = await queueAPI.getMyStatus(driverId);

    if (status.status) {
      showInQueue(status.status);
    } else {
      showNoQueue();
    }
  } catch (error) {
    console.error('Error loading queue status:', error);
  }
}

// Load active queue
async function loadActiveQueue() {
  try {
    const data = await queueAPI.getActive();
    const queueList = document.getElementById('queue-list');

    if (data.queue.length === 0) {
      queueList.innerHTML = '<p class="text-center text-muted">No drivers in queue</p>';
      return;
    }

    queueList.innerHTML = data.queue.map((entry, index) => `
      <div class="d-flex justify-content-between align-items-center mb-2 p-2 ${index === 0 ? 'bg-success text-white rounded' : ''}">
        <div>
          <strong>${index + 1}. ${entry.driver_name || 'Driver #' + entry.driver_id}</strong>
          <br><small>${new Date(entry.check_in_time).toLocaleTimeString()}</small>
        </div>
        ${index === 0 ? '<span class="badge bg-light text-success">NEXT</span>' : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading active queue:', error);
  }
}

// Show queue status UI
function showInQueue(queueEntry) {
  document.getElementById('no-queue').style.display = 'none';
  document.getElementById('in-queue').style.display = 'block';

  if (queueEntry.status === 'waiting') {
    document.getElementById('queue-status-text').textContent = 'Status: Waiting in queue';
    document.getElementById('waiting-info').style.display = 'block';
    document.getElementById('on-trip-info').style.display = 'none';

    // Calculate position
    queueAPI.getActive().then(data => {
      const position = data.queue.findIndex(q => q.id === queueEntry.id) + 1;
      document.getElementById('position').textContent = position;
      document.getElementById('checkin-time').textContent = new Date(queueEntry.check_in_time).toLocaleTimeString();
    });
  } else if (queueEntry.status === 'on-trip') {
    document.getElementById('queue-status-text').textContent = 'Status: On Trip';
    document.getElementById('waiting-info').style.display = 'none';
    document.getElementById('on-trip-info').style.display = 'block';
  }
}

// Show no queue UI
function showNoQueue() {
  document.getElementById('no-queue').style.display = 'block';
  document.getElementById('in-queue').style.display = 'none';
}

// Join queue button
document.getElementById('join-queue-btn')?.addEventListener('click', async () => {
  if (!driverId) return;

  try {
    const vehicleId = currentUser()?.vehicleId?._id || currentUser()?.vehicleId;
    await queueAPI.join(driverId, vehicleId);
    Swal.fire({
      title: 'Success!',
      text: 'Successfully joined the queue!',
      icon: 'success',
      confirmButtonText: 'Ok'
    });
    loadQueueStatus();
    loadActiveQueue();
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: error.message || 'Failed to join queue',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
  }
});

// Complete trip button
document.getElementById('complete-trip-btn')?.addEventListener('click', async () => {
  if (!driverId) return;

  try {
    const status = await queueAPI.getMyStatus(driverId);
    if (status.status && status.status.status === 'on-trip') {
      await queueAPI.complete(status.status.id);
      Swal.fire({
        title: 'Trip completed!',
        text: 'You are now back in the queue.',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
      loadQueueStatus();
      loadActiveQueue();
    }
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: error.message || 'Failed to complete trip',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
  }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  logout();
  window.location.href = '/';
});
