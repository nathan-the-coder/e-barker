import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userAPI, vehicleAPI, settingsAPI } from '../utils/api';

function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [settings, setSettings] = useState({ base_fare: 15, per_km_rate: 5, terminal_fee: 10 });
  const [settingsDraft, setSettingsDraft] = useState({});
  const [activeTab, setActiveTab] = useState('drivers');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') {
      navigate(user.role === 'driver' ? '/driver' : '/dashboard');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [usersRes, vehiclesRes, settingsRes] = await Promise.all([
        userAPI.getAll(),
        vehicleAPI.getAll(),
        settingsAPI.getAll()
      ]);
      setUsers(usersRes.users || []);
      setVehicles(vehiclesRes.vehicles || []);
      const s = settingsRes.settings || {};
      const merged = {
        base_fare: parseFloat(s.base_fare || 15),
        per_km_rate: parseFloat(s.per_km_rate || 5),
        terminal_fee: parseFloat(s.terminal_fee || 10),
        google_maps_api_key: s.google_maps_api_key || ''
      };
      setSettings(merged);
      setSettingsDraft(merged);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const keys = ['base_fare', 'per_km_rate', 'terminal_fee', 'google_maps_api_key'];
      await Promise.all(keys.map(k => settingsAPI.update(k, settingsDraft[k])));
      setSettings({ ...settingsDraft });
      Swal.fire({ title: 'Settings Saved!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message || 'Failed to save settings', icon: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const drivers     = users.filter(u => u.role === 'driver');
  const dispatchers = users.filter(u => u.role === 'dispatcher');

  const tabs = [
    { id: 'drivers',     label: `🚗 Drivers (${drivers.length})` },
    { id: 'dispatchers', label: `📻 Dispatchers (${dispatchers.length})` },
    { id: 'vehicles',   label: `🚐 Vehicles (${vehicles.length})` },
    { id: 'settings',    label: '⚙️ Fare Settings' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      <nav className="navbar navbar-dark" style={{ background: 'linear-gradient(135deg,#1a237e,#283593)' }}>
        <div className="container">
           <span className="navbar-brand fw-bold">🚐 E-Barker Admin</span>
          <span className="text-white opacity-75 small">Admin: {user.name || user.email}</span>
          <div className="d-flex gap-2">
            <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-outline-light">Dashboard</button>
            <button onClick={() => navigate('/reports')} className="btn btn-sm btn-outline-light">Reports</button>
            <button onClick={logout} className="btn btn-sm btn-danger">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        {/* Stats row */}
        <div className="row g-3 mb-4">
           {[
             { icon: '🚗', val: drivers.length, label: 'Total Drivers', color: 'text-primary' },
             { icon: '📻', val: dispatchers.length, label: 'Dispatchers', color: 'text-secondary' },
             { icon: '🚐', val: vehicles.filter(t => t.isActive).length, label: 'Active Vehicles', color: 'text-success' },
             { icon: '🏷', val: `₱${parseFloat(settings.terminal_fee).toFixed(2)}`, label: 'Terminal Fee', color: 'text-warning' }
           ].map((s, i) => (
            <div key={i} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <h4 className={`fw-bold mb-0 ${s.color}`}>{s.val}</h4>
                <small className="text-muted">{s.label}</small>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div className="card-header bg-white border-0 px-0 pt-0" style={{ background: 'white' }}>
            <ul className="nav nav-tabs border-0 px-3 pt-3">
              {tabs.map(t => (
                <li key={t.id} className="nav-item">
                  <button
                    className={`nav-link fw-semibold ${activeTab === t.id ? 'active' : 'text-muted'}`}
                    onClick={() => setActiveTab(t.id)}
                    style={{ borderRadius: '8px 8px 0 0' }}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-body">
            {/* Drivers tab */}
            {activeTab === 'drivers' && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Registered Drivers</h6>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr><th>Name</th><th>Username</th><th>Body #</th><th>Contact</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {drivers.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted py-4">No drivers registered</td></tr>
                      )}
                       {drivers.map(d => (
                         <tr key={d._id}>
                           <td><strong>{d.name}</strong></td>
                           <td className="text-muted">{d.username}</td>
                           <td><span className="badge bg-primary">{d.vehicleId?.bodyNumber || '—'}</span></td>
                           <td>{d.phone || '—'}</td>
                           <td><span className={`badge ${d.isActive !== false ? 'bg-success' : 'bg-secondary'}`}>
                             {d.isActive !== false ? 'Active' : 'Inactive'}
                           </span></td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Dispatchers tab */}
            {activeTab === 'dispatchers' && (
              <>
                <h6 className="fw-bold mb-3">Registered Dispatchers</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr><th>Name</th><th>Username</th><th>Email</th></tr>
                    </thead>
                    <tbody>
                      {dispatchers.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-4">No dispatchers registered</td></tr>
                      )}
                      {dispatchers.map(d => (
                        <tr key={d._id}>
                          <td><strong>{d.name}</strong></td>
                          <td className="text-muted">{d.username}</td>
                          <td>{d.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

             {/* Vehicles tab */}
             {activeTab === 'vehicles' && (
               <>
                 <h6 className="fw-bold mb-3">Registered Vehicles (PUV Vans)</h6>
                 <div className="table-responsive">
                   <table className="table table-hover align-middle">
                     <thead className="table-light">
                       <tr><th>Body #</th><th>Plate #</th><th>Model</th><th>Type</th><th>Assigned Driver</th><th>Status</th></tr>
                     </thead>
                     <tbody>
                       {vehicles.length === 0 && (
                         <tr><td colSpan={6} className="text-center text-muted py-4">No vehicles registered</td></tr>
                       )}
                       {vehicles.map(t => (
                         <tr key={t._id}>
                           <td><span className="badge bg-primary">{t.bodyNumber}</span></td>
                           <td className="text-muted">{t.plateNumber}</td>
                           <td>{t.model || '—'} {t.year && `(${t.year})`}</td>
                           <td><span className="badge bg-info">{t.vehicleType || 'PUV Van'}</span></td>
                           <td>{t.driverId?.name || <span className="text-muted">Unassigned</span>}</td>
                           <td><span className={`badge ${t.isActive ? 'bg-success' : 'bg-secondary'}`}>
                             {t.isActive ? 'Active' : 'Inactive'}
                           </span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </>
             )}

            {/* Fare Settings tab */}
            {activeTab === 'settings' && (
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <h6 className="fw-bold mb-3">💰 Fare Matrix</h6>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Base Fare (₱)</label>
                    <p className="text-muted small mb-1">Fixed charge every time a passenger boards.</p>
                    <div className="input-group">
                      <span className="input-group-text">₱</span>
                      <input type="number" className="form-control" min={0} step={0.5}
                        value={settingsDraft.base_fare ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, base_fare: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Per-Km Rate (₱/km)</label>
                    <p className="text-muted small mb-1">Charge added per kilometer traveled.</p>
                    <div className="input-group">
                      <span className="input-group-text">₱</span>
                      <input type="number" className="form-control" min={0} step={0.5}
                        value={settingsDraft.per_km_rate ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, per_km_rate: e.target.value }))} />
                      <span className="input-group-text">/km</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-semibold">Terminal Fee (₱)</label>
                    <p className="text-muted small mb-1">Fee charged to the driver per dispatch.</p>
                    <div className="input-group">
                      <span className="input-group-text">₱</span>
                      <input type="number" className="form-control" min={0} step={0.5}
                        value={settingsDraft.terminal_fee ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, terminal_fee: e.target.value }))} />
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3">🗺 Google Maps API Key</h6>
                  <div className="mb-4">
                    <p className="text-muted small mb-1">
                      Used for route calculation and traffic data on the backend.
                      Get yours at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a>.
                    </p>
                    <input type="text" className="form-control" placeholder="AIza…"
                      value={settingsDraft.google_maps_api_key ?? ''}
                      onChange={e => setSettingsDraft(d => ({ ...d, google_maps_api_key: e.target.value }))} />
                  </div>

                  <button onClick={handleSaveSettings} disabled={savingSettings}
                    className="btn btn-primary fw-semibold w-100" style={{ borderRadius: 8 }}>
                    {savingSettings ? '⏳ Saving…' : '💾 Save Settings'}
                  </button>
                </div>

                {/* Fare preview */}
                <div className="col-12 col-md-6">
                  <h6 className="fw-bold mb-3">👁 Live Fare Preview</h6>
                  <div className="card border-0" style={{ background: 'linear-gradient(135deg,#e8eaf6,#fff)', borderRadius: 14, border: '2px solid #1a237e' }}>
                    <div className="card-body">
                      {[1, 2, 3, 5].map(km => {
                        const bf = parseFloat(settingsDraft.base_fare || 15);
                        const pkm = parseFloat(settingsDraft.per_km_rate || 5);
                        const fare = bf + pkm * km;
                        return (
                          <div key={km} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <span className="small text-muted">{km} km trip</span>
                            <strong className="text-success">₱{fare.toFixed(2)}</strong>
                          </div>
                        );
                      })}
                      <div className="mt-3 small text-muted">
                        Formula: ₱{parseFloat(settingsDraft.base_fare || 15).toFixed(2)} base + ₱{parseFloat(settingsDraft.per_km_rate || 5).toFixed(2)} × distance
                      </div>
                    </div>
                  </div>
                  <div className="alert alert-info mt-3 small">
                    <strong>Terminal Fee:</strong> ₱{parseFloat(settingsDraft.terminal_fee || 10).toFixed(2)} is deducted from the driver per trip dispatch (not from passenger fare).
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
