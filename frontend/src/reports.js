import { onAuthChange, logout } from './auth.js';
import { transactionAPI, queueAPI } from './api.js';

let charts = {};

// Check auth state
onAuthChange(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  if (user.role !== 'dispatcher' && user.role !== 'admin') {
    window.location.href = '/driver.html';
    return;
  }

  document.getElementById('user-display').textContent = `${user.role}: ${user.name || user.email}`;

  // Set default dates
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
  document.getElementById('end-date').value = endDate.toISOString().split('T')[0];

  loadReports();
});

// Load reports data
async function loadReports() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  try {
    // Load transactions
    const transData = await transactionAPI.getByDateRange(startDate, endDate);
    updateTransactionsTable(transData.transactions);
    updateTotalCollections(transData.transactions);

    // Load queue stats
    const statsData = await queueAPI.getStats(startDate, endDate);
    updateCharts(transData.transactions, statsData.stats);
  } catch (error) {
    console.error('Error loading reports:', error);
  }
}

// Update transactions table
function updateTransactionsTable(transactions) {
  const tbody = document.getElementById('transactions-tbody');

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions found</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${new Date(t.transaction_time).toLocaleDateString()}</td>
      <td>${t.driver_name || 'Driver #' + t.driver_id}</td>
      <td>#${t.queue_id}</td>
      <td>₱ ${parseFloat(t.fee_amount).toFixed(2)}</td>
    </tr>
  `).join('');
}

// Update total collections
function updateTotalCollections(transactions) {
  const total = transactions.reduce((sum, t) => sum + parseFloat(t.fee_amount), 0);
  document.getElementById('total-collections').textContent = `₱ ${total.toFixed(2)}`;
}

// Update charts
function updateCharts(transactions, stats) {
  // Destroy existing charts
  Object.values(charts).forEach(chart => chart.destroy());
  charts = {};

  // Daily Collections Chart
  const dailyData = groupByDate(transactions);
  const dailyCtx = document.getElementById('daily-chart').getContext('2d');
  charts.daily = new Chart(dailyCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(dailyData),
      datasets: [{
        label: 'Collections (₱)',
        data: Object.values(dailyData),
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Queue Stats Chart
  const statsCtx = document.getElementById('queue-stats-chart').getContext('2d');
  charts.queue = new Chart(statsCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed Trips', 'Waiting', 'On Trip'],
      datasets: [{
        data: [stats.total_trips || 0, stats.waiting_count || 0, stats.on_trip_count || 0],
        backgroundColor: [
          'rgba(40, 167, 69, 0.5)',
          'rgba(255, 193, 7, 0.5)',
          'rgba(0, 123, 255, 0.5)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true
    }
  });
}

// Group transactions by date
function groupByDate(transactions) {
  const grouped = {};
  transactions.forEach(t => {
    const date = new Date(t.transaction_time).toLocaleDateString();
    grouped[date] = (grouped[date] || 0) + parseFloat(t.fee_amount);
  });
  return grouped;
}

// Filter button handler
document.getElementById('filter-btn')?.addEventListener('click', () => {
  loadReports();
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  logout();
  window.location.href = '/';
});
