import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { transactionAPI } from '../utils/api';
import Chart from 'chart.js/auto';

function ReportsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      let startDate, endDate;

      if (reportType === 'daily') {
        startDate = date;
        endDate = date;
      } else if (reportType === 'weekly') {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const startD = new Date(d); startD.setDate(d.getDate() - dayOfWeek);
        const endD   = new Date(startD); endD.setDate(startD.getDate() + 6);
        startDate = startD.toISOString().split('T')[0];
        endDate   = endD.toISOString().split('T')[0];
      } else {
        const [yr, mo] = date.split('-');
        startDate = `${yr}-${mo}-01`;
        endDate   = `${yr}-${mo}-31`;
      }

      const data = await transactionAPI.getByDateRange(startDate, endDate);
      const txns = data.transactions || [];
      setTransactions(txns);
      const totalCalc = txns.reduce((sum, t) => sum + parseFloat(t.feeAmount), 0);
      setTotal(totalCalc);
      setTimeout(() => renderChart(txns), 100);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (txns) => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const grouped = txns.reduce((acc, t) => {
      const key = new Date(t.createdAt).toLocaleDateString();
      acc[key] = (acc[key] || 0) + parseFloat(t.feeAmount);
      return acc;
    }, {});

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: 'Collections (₱)',
          data: Object.values(grouped),
          backgroundColor: 'rgba(26,35,126,0.7)',
          borderColor: '#1a237e',
          borderRadius: 6,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Collections`,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '₱' + v.toFixed(2) }
          }
        }
      }
    });
  };

  useEffect(() => () => { if (chartInstance.current) chartInstance.current.destroy(); }, []);

  if (!user || (user.role !== 'dispatcher' && user.role !== 'admin')) {
    navigate('/'); return null;
  }

  const avgFee = transactions.length ? (total / transactions.length) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <nav className="navbar navbar-dark" style={{ background: 'linear-gradient(135deg,#1a237e,#283593)' }}>
        <div className="container">
          <span className="navbar-brand fw-bold">🛺 E-Barker</span>
          <span className="text-white opacity-75 small">{user.role}: {user.name || user.email}</span>
          <div className="d-flex gap-2">
            <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-outline-light">← Dashboard</button>
            <button onClick={logout} className="btn btn-sm btn-danger">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <h4 className="fw-bold mb-4">📊 Reports &amp; Analytics</h4>

        {/* Filter card */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-sm-4">
                <label className="form-label small fw-semibold">Report Type</label>
                <select className="form-select form-select-sm" value={reportType}
                  onChange={e => setReportType(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="col-sm-4">
                <label className="form-label small fw-semibold">
                  {reportType === 'monthly' ? 'Month' : 'Date'}
                </label>
                <input
                  type={reportType === 'monthly' ? 'month' : 'date'}
                  className="form-control form-control-sm"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="col-sm-4">
                <button onClick={generateReport} disabled={loading}
                  className="btn btn-primary w-100 fw-semibold" style={{ borderRadius: 8 }}>
                  {loading ? '⏳ Generating…' : '📊 Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {transactions.length > 0 && (
          <>
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
                  <div style={{ fontSize: 28 }}>💰</div>
                  <h4 className="fw-bold mb-0 text-success">₱{total.toFixed(2)}</h4>
                  <small className="text-muted">Total Collected</small>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
                  <div style={{ fontSize: 28 }}>🚗</div>
                  <h4 className="fw-bold mb-0 text-primary">{transactions.length}</h4>
                  <small className="text-muted">Total Trips</small>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
                  <div style={{ fontSize: 28 }}>📈</div>
                  <h4 className="fw-bold mb-0 text-warning">₱{avgFee.toFixed(2)}</h4>
                  <small className="text-muted">Avg. Fee / Trip</small>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
                  <div style={{ fontSize: 28 }}>👤</div>
                  <h4 className="fw-bold mb-0 text-secondary">
                    {[...new Set(transactions.map(t => t.driverId?._id))].length}
                  </h4>
                  <small className="text-muted">Active Drivers</small>
                </div>
              </div>
            </div>

            <div className="row g-4">
              {/* Chart */}
              <div className="col-12 col-lg-7">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-body">
                    <canvas ref={chartRef} />
                  </div>
                </div>
              </div>

              {/* Transaction table */}
              <div className="col-12 col-lg-5">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-header bg-white border-0 py-3">
                    <h6 className="mb-0 fw-bold">Transaction Log</h6>
                  </div>
                  <div className="card-body p-0" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table className="table table-hover table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Date</th>
                          <th>Driver</th>
                          <th className="text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(t => (
                          <tr key={t._id}>
                            <td className="small">{new Date(t.createdAt).toLocaleDateString()}</td>
                            <td className="small">{t.driverId?.name || 'Driver'}</td>
                            <td className="text-end small fw-semibold text-success">₱{parseFloat(t.feeAmount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan={2}><strong>Total</strong></td>
                          <td className="text-end"><strong className="text-success">₱{total.toFixed(2)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {transactions.length === 0 && !loading && (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: 48 }}>📊</div>
            <p className="mt-2">No transactions found. Select a date range and click Generate.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
