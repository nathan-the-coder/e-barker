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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker
            </span>
            <span className="text-white/75 text-sm hidden sm:block">{user.role}: {user.name || user.email}</span>
            <div className="flex gap-2">
              <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition">
                <i className="fa-solid fa-arrow-left mr-1"></i> Dashboard
              </button>
              <button onClick={logout} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition">
                <i className="fa-solid fa-sign-out-alt mr-1"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <h4 className="font-bold text-2xl text-gray-800 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-chart-bar text-indigo-900"></i> Reports & Analytics
        </h4>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Report Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none" value={reportType}
                onChange={e => setReportType(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {reportType === 'monthly' ? 'Month' : 'Date'}
              </label>
              <input
                type={reportType === 'monthly' ? 'month' : 'date'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <button onClick={generateReport} disabled={loading}
                className="w-full bg-indigo-900 hover:bg-indigo-800 text-white py-2 rounded-lg font-semibold transition">
                {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Generating…</> : <><i className="fa-solid fa-chart-bar mr-2"></i> Generate Report</>}
              </button>
            </div>
          </div>
        </div>

        {transactions.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md text-center py-4">
                <i className="fa-solid fa-money-bill-wave text-2xl text-green-600 mb-2"></i>
                <h4 className="font-bold text-xl text-green-600">₱{total.toFixed(2)}</h4>
                <small className="text-gray-500">Total Collected</small>
              </div>
              <div className="bg-white rounded-xl shadow-md text-center py-4">
                <i className="fa-solid fa-car text-2xl text-indigo-900 mb-2"></i>
                <h4 className="font-bold text-xl text-indigo-900">{transactions.length}</h4>
                <small className="text-gray-500">Total Trips</small>
              </div>
              <div className="bg-white rounded-xl shadow-md text-center py-4">
                <i className="fa-solid fa-chart-line text-2xl text-orange-500 mb-2"></i>
                <h4 className="font-bold text-xl text-orange-500">₱{avgFee.toFixed(2)}</h4>
                <small className="text-gray-500">Avg. Fee / Trip</small>
              </div>
              <div className="bg-white rounded-xl shadow-md text-center py-4">
                <i className="fa-solid fa-user text-2xl text-gray-600 mb-2"></i>
                <h4 className="font-bold text-xl text-gray-600">
                  {[...new Set(transactions.map(t => t.driverId?._id))].length}
                </h4>
                <small className="text-gray-500">Active Drivers</small>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              <div className="lg:col-span-4">
                <div className="bg-white rounded-xl shadow-md p-4">
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h6 className="font-bold flex items-center gap-2">
                      <i className="fa-solid fa-list text-indigo-900"></i> Transaction Log
                    </h6>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Driver</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map(t => (
                          <tr key={t._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{t.driverId?.name || 'Driver'}</td>
                            <td className="px-4 py-2 text-right font-semibold text-green-600">₱{parseFloat(t.feeAmount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-2 font-semibold" colSpan={2}>Total</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">₱{total.toFixed(2)}</td>
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
          <div className="text-center py-12 text-gray-500">
            <i className="fa-solid fa-chart-bar text-5xl text-gray-300 mb-3"></i>
            <p className="mt-2">No transactions found. Select a date range and click Generate.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;