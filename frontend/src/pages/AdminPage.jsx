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
  const [assigningVehicle, setAssigningVehicle] = useState(false);

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

  const handleAssignVehicle = async (driverId, vehicleId) => {
    setAssigningVehicle(true);
    try {
      await userAPI.update(driverId, { vehicleId: vehicleId || null });
      await loadData();
      Swal.fire({ title: 'Vehicle Assigned!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message || 'Failed to assign vehicle', icon: 'error' });
    } finally {
      setAssigningVehicle(false);
    }
  };

  const showVehicleAssignModal = (driver) => {
    const availableVehicles = vehicles.filter(v => !v.driverId || v.driverId._id === driver._id);
    
    Swal.fire({
      title: `Assign Vehicle to ${driver.name}`,
      html: `
        <select id="vehicleSelect" class="swal2-select w-full mt-2">
          <option value="">-- No Vehicle --</option>
          ${vehicles.map(v => `
            <option value="${v._id}" ${driver.vehicleId?._id === v._id ? 'selected' : ''}>
              ${v.bodyNumber} (${v.plateNumber}) - ${v.vehicleType || 'PUV Van'}
            </option>
          `).join('')}
        </select>
      `,
      preConfirm: () => {
        const vehicleId = document.getElementById('vehicleSelect').value;
        return handleAssignVehicle(driver._id, vehicleId || null);
      },
      showCancelButton: true,
      confirmButtonText: 'Assign',
      cancelButtonText: 'Cancel'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-indigo-900 text-xl">
          <i className="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const drivers     = users.filter(u => u.role === 'driver');
  const dispatchers = users.filter(u => u.role === 'dispatcher');

  const tabs = [
    { id: 'drivers',     label: `Drivers (${drivers.length})`, icon: 'fa-car' },
    { id: 'dispatchers', label: `Dispatchers (${dispatchers.length})`, icon: 'fa-walkie-talkie' },
    { id: 'vehicles',   label: `Vehicles (${vehicles.length})`, icon: 'fa-bus' },
    { id: 'settings',    label: 'Fare Settings', icon: 'fa-gear' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker Admin
            </span>
            <span className="text-white/75 text-sm hidden sm:block">Admin: {user.name || user.email}</span>
            <div className="flex gap-2">
              <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition">
                <i className="fa-solid fa-gauge mr-1"></i> Dashboard
              </button>
              <button onClick={() => navigate('/reports')} className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition">
                <i className="fa-solid fa-chart-bar mr-1"></i> Reports
              </button>
              <button onClick={logout} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition">
                <i className="fa-solid fa-sign-out-alt mr-1"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           {[
             { icon: 'fa-car', val: drivers.length, label: 'Total Drivers', color: 'text-indigo-900' },
             { icon: 'fa-walkie-talkie', val: dispatchers.length, label: 'Dispatchers', color: 'text-gray-600' },
             { icon: 'fa-bus', val: vehicles.filter(t => t.isActive).length, label: 'Active Vehicles', color: 'text-green-600' },
             { icon: 'fa-tag', val: `₱${parseFloat(settings.terminal_fee).toFixed(2)}`, label: 'Terminal Fee', color: 'text-orange-500' }
           ].map((s, i) => (
             <div key={i} className="bg-white rounded-xl shadow-md text-center py-4">
               <i className={`fa-solid ${s.icon} text-2xl ${s.color} mb-2`}></i>
               <h4 className={`font-bold text-xl ${s.color}`}>{s.val}</h4>
               <small className="text-gray-500">{s.label}</small>
             </div>
           ))}
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="border-b bg-gray-50">
            <div className="flex overflow-x-auto px-3 pt-3">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 transition ${
                    activeTab === t.id
                      ? 'bg-indigo-900 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className={`fa-solid ${t.icon} mr-1`}></i> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'drivers' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h6 className="font-bold text-lg text-gray-800">Registered Drivers</h6>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Username</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Body #</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contact</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
{drivers.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-500 py-6">No drivers registered</td></tr>
                       )}
                        {drivers.map(d => (
                          <tr key={d._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{d.name}</td>
                            <td className="px-4 py-3 text-gray-500">{d.username}</td>
                            <td className="px-4 py-3"><span className="bg-indigo-900 text-white px-2 py-1 rounded text-xs">{d.vehicleId?.bodyNumber || '—'}</span></td>
                            <td className="px-4 py-3">{d.phone || '—'}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${d.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {d.isActive !== false ? 'Active' : 'Inactive'}
                            </span></td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => showVehicleAssignModal(d)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                disabled={assigningVehicle}
                              >
                                {d.vehicleId ? 'Change' : 'Assign'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'dispatchers' && (
              <>
                <h6 className="font-bold text-lg text-gray-800 mb-4">Registered Dispatchers</h6>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Username</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {dispatchers.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-gray-500 py-6">No dispatchers registered</td></tr>
                      )}
                      {dispatchers.map(d => (
                        <tr key={d._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-gray-500">{d.username}</td>
                          <td className="px-4 py-3">{d.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

             {activeTab === 'vehicles' && (
               <>
                 <h6 className="font-bold text-lg text-gray-800 mb-4">Registered Vehicles (PUV Vans)</h6>
                 <div className="overflow-x-auto">
                   <table className="w-full">
                     <thead className="bg-gray-50">
                       <tr><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Body #</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Plate #</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Model</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Assigned Driver</th><th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th></tr>
                     </thead>
                     <tbody className="divide-y">
                       {vehicles.length === 0 && (
                         <tr><td colSpan={6} className="text-center text-gray-500 py-6">No vehicles registered</td></tr>
                       )}
                       {vehicles.map(t => (
                         <tr key={t._id} className="hover:bg-gray-50">
                           <td className="px-4 py-3"><span className="bg-indigo-900 text-white px-2 py-1 rounded text-xs">{t.bodyNumber}</span></td>
                           <td className="px-4 py-3 text-gray-500">{t.plateNumber}</td>
                           <td className="px-4 py-3">{t.model || '—'} {t.year && `(${t.year})`}</td>
                           <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{t.vehicleType || 'PUV Van'}</span></td>
                           <td className="px-4 py-3">{t.driverId?.name || <span className="text-gray-500">Unassigned</span>}</td>
                           <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                             {t.isActive ? 'Active' : 'Inactive'}
                           </span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </>
             )}

            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h6 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-money-bill-wave text-green-600"></i> Fare Matrix
                  </h6>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Base Fare (₱)</label>
                    <p className="text-gray-500 text-xs mb-1">Fixed charge every time a passenger boards.</p>
                    <div className="flex">
                      <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">₱</span>
                      <input type="number" className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none" min={0} step={0.5}
                        value={settingsDraft.base_fare ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, base_fare: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Per-Km Rate (₱/km)</label>
                    <p className="text-gray-500 text-xs mb-1">Charge added per kilometer traveled.</p>
                    <div className="flex">
                      <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">₱</span>
                      <input type="number" className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none" min={0} step={0.5}
                        value={settingsDraft.per_km_rate ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, per_km_rate: e.target.value }))} />
                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">/km</span>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Terminal Fee (₱)</label>
                    <p className="text-gray-500 text-xs mb-1">Fee charged to the driver per dispatch.</p>
                    <div className="flex">
                      <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">₱</span>
                      <input type="number" className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none" min={0} step={0.5}
                        value={settingsDraft.terminal_fee ?? ''}
                        onChange={e => setSettingsDraft(d => ({ ...d, terminal_fee: e.target.value }))} />
                    </div>
                  </div>

                  <h6 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-map text-blue-500"></i> Google Maps API Key
                  </h6>
                  <div className="mb-4">
                    <p className="text-gray-500 text-xs mb-1">
                      Used for route calculation and traffic data on the backend.
                      Get yours at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-900 underline">console.cloud.google.com</a>.
                    </p>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none" placeholder="AIza…"
                      value={settingsDraft.google_maps_api_key ?? ''}
                      onChange={e => setSettingsDraft(d => ({ ...d, google_maps_api_key: e.target.value }))} />
                  </div>

                  <button onClick={handleSaveSettings} disabled={savingSettings}
                    className="w-full bg-indigo-900 hover:bg-indigo-800 text-white py-3 rounded-lg font-semibold transition" style={{ borderRadius: 8 }}>
                    {savingSettings ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Saving…</> : <><i className="fa-solid fa-save mr-2"></i> Save Settings</>}
                  </button>
                </div>

                <div>
                  <h6 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-eye text-purple-500"></i> Live Fare Preview
                  </h6>
                  <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4" style={{ border: '2px solid #1a237e' }}>
                    <div className="space-y-3">
                      {[1, 2, 3, 5].map(km => {
                        const bf = parseFloat(settingsDraft.base_fare || 15);
                        const pkm = parseFloat(settingsDraft.per_km_rate || 5);
                        const fare = bf + pkm * km;
                        return (
                          <div key={km} className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-500">{km} km trip</span>
                            <strong className="text-green-600">₱{fare.toFixed(2)}</strong>
                          </div>
                        );
                      })}
                      <div className="mt-3 text-xs text-gray-500">
                        Formula: ₱{parseFloat(settingsDraft.base_fare || 15).toFixed(2)} base + ₱{parseFloat(settingsDraft.per_km_rate || 5).toFixed(2)} × distance
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 mt-4 p-3 rounded-lg text-sm">
                    <strong><i className="fa-solid fa-info-circle mr-1"></i> Terminal Fee:</strong> ₱{parseFloat(settingsDraft.terminal_fee || 10).toFixed(2)} is deducted from the driver per trip dispatch (not from passenger fare).
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