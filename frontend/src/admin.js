import Swal from 'sweetalert2';
import { onAuthChange, logout } from './auth.js';
import { userAPI, vehicleAPI, queueAPI, transactionAPI } from './api.js';

// Check auth state
onAuthChange(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  if (user.role !== 'admin') {
    window.location.href = user.role === 'dispatcher' ? '/dispatcher_dashboard.html' : '/driver.html';
    return;
  }

  document.getElementById('user-display').textContent = `Admin: ${user.name || user.username}`;

  loadDashboardStats();
  loadDrivers();
  loadVehicles();
});

// Load dashboard stats
async function loadDashboardStats() {
  try {
    const [driversRes, queueRes, transRes] = await Promise.all([
      fetch('http://localhost:3000/api/users').then(r => r.json()),
      queueAPI.getStats(),
      transactionAPI.getToday()
    ]);

    document.getElementById('total-drivers').textContent = driversRes.users?.filter(u => u.role === 'driver').length || 0;
    document.getElementById('active-queue').textContent = queueRes.stats?.waiting_count || 0;
    document.getElementById('on-trip-count').textContent = queueRes.stats?.on_trip_count || 0;
    document.getElementById('today-revenue').textContent = `₱${(transRes.total || 0).toFixed(2)}`;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load drivers table
async function loadDrivers() {
  try {
    const data = await userAPI.getAll();
    const tbody = document.getElementById('drivers-tbody');

    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No drivers found</td></tr>';
      return;
    }

    const drivers = data.users.filter(u => u.role === 'driver');
    tbody.innerHTML = drivers.map(d => `
      <tr>
        <td>${d.name}</td>
        <td>${d.username}</td>
        <td>${d.vehicleId?.bodyNumber || 'N/A'}</td>
        <td>${d.phone || 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editDriver('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deactivateDriver('${d.id}')">Deactivate</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading drivers:', error);
  }
}

// Load vehicles table
async function loadVehicles() {
  try {
    const data = await vehicleAPI.getAll();
    const tbody = document.getElementById('vehicles-tbody');

    if (!data.vehicles || data.vehicles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No vehicles found</td></tr>';
      return;
    }

    tbody.innerHTML = data.vehicles.map(t => `
      <tr>
        <td>${t.bodyNumber}</td>
        <td>${t.plateNumber}</td>
        <td>${t.model || 'N/A'} ${t.year ? `(${t.year})` : ''}</td>
        <td><span class="badge bg-info">${t.vehicleType || 'PUV Van'}</span></td>
        <td>${t.driverId?.name || 'Unassigned'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editVehicle('${t.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deactivateVehicle('${t.id}')">Deactivate</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading vehicles:', error);
  }
}

// Generate report
document.getElementById('generate-report')?.addEventListener('click', async () => {
  const type = document.getElementById('report-type').value;
  const date = document.getElementById('report-date').value;

  if (!date) {
    Swal.fire({
      title: 'Missing date',
      text: 'Please select a date',
      icon: 'warning',
      confirmButtonText: 'Ok'
    });
    return;
  }

  try {
    let startDate, endDate;

    if (type === 'daily') {
      startDate = date;
      endDate = date;
    } else if (type === 'weekly') {
      const d = new Date(date);
      startDate = new Date(d.setDate(d.getDate() - d.getDay())).toISOString().split('T')[0];
      endDate = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0];
    } else if (type === 'monthly') {
      startDate = date + '-01';
      endDate = date + '-31';
    }

    const data = await transactionAPI.getByDateRange(startDate, endDate);
    const resultsDiv = document.getElementById('report-results');

    if (!data.transactions || data.transactions.length === 0) {
      resultsDiv.innerHTML = '<p class="text-center text-muted">No transactions found for selected period</p>';
      return;
    }

    const total = data.transactions.reduce((sum, t) => sum + parseFloat(t.fee_amount), 0);
    resultsDiv.innerHTML = `
      <div class="alert alert-info">
        <h5>Report Summary (${type})</h5>
        <p class="mb-0">Period: ${startDate} to ${endDate}</p>
        <p class="mb-0">Total Transactions: ${data.transactions.length}</p>
        <h4>Total Revenue: ₱${total.toFixed(2)}</h4>
      </div>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Driver</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.map(t => `
              <tr>
                <td>${new Date(t.transaction_time).toLocaleDateString()}</td>
                <td>${t.driver_name || 'Driver #' + t.driver_id}</td>
                <td>₱${parseFloat(t.fee_amount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error generating report:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to generate report',
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
