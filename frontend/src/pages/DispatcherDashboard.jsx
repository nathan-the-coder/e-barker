import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { queueAPI, transactionAPI, fareAPI } from "../utils/api";
import { getTrafficData } from "../maps.js";

function DispatcherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeQueue, setActiveQueue] = useState([]);
  const [recentQueue, setRecentQueue] = useState([]);
  const [trackingQueue, setTrackingQueue] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fareMatrix, setFareMatrix] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [pendingTrips, setPendingTrips] = useState([]);

  const TERMINAL = "San Jose, Baggao, Cagayan";
  const MAIN_DEST = "Tuguegarao City, Cagayan";

  const loadData = async () => {
    try {
      const [active, recent, today, matrix, tracking, pending] = await Promise.all([
        queueAPI.getActive(),
        queueAPI.getRecent(),
        transactionAPI.getToday(),
        fareAPI.getMatrix(),
        queueAPI.getTracking(),
        queueAPI.getPending(),
      ]);
      setActiveQueue(active.queue || []);
      setRecentQueue(recent.queue || []);
      setTodayTotal(today.total || 0);
      setTodayTrips((today.transactions || []).length);
      setFareMatrix(matrix.matrix);
      setTrackingQueue(tracking.vehicles || []);
      setPendingTrips(pending.pending || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  };

  const loadTraffic = async () => {
    setTrafficLoading(true);
    try {
      const res = await getTrafficData(TERMINAL, MAIN_DEST);
      setTraffic(res);
    } catch (err) {
      console.error("Traffic error:", err);
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "dispatcher" && user.role !== "admin") {
      navigate(user.role === "driver" ? "/driver" : "/admin");
      return;
    }
    loadData();
    loadTraffic();
    const iv = setInterval(loadData, 10000);
    const tv = setInterval(loadTraffic, 120000);
    return () => {
      clearInterval(iv);
      clearInterval(tv);
    };
  }, [user]);

  const congestionColor = (level) =>
    level === "heavy" ? "#d32f2f" : level === "moderate" ? "#f57c00" : "#388e3c";

  const congestionBg = (level) =>
    level === "heavy" ? "#ffebee" : level === "moderate" ? "#fff3e0" : "#e8f5e9";

  const handleRecordTrip = async (transactionId, driverName, routeTaken) => {
    const { value: formValues } = await Swal.fire({
      title: `Record Trip - ${driverName}`,
      html: `
        <div class="text-left">
          <div class="mb-3">
            <label class="block text-sm font-medium mb-1">Route Taken</label>
            <div class="text-lg font-bold text-indigo-900">${routeTaken === 'highway' ? 'Highway' : routeTaken === 'penablanca' ? 'Penablanca' : 'N/A'}</div>
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium mb-1">Regular (₱150)</label>
            <input type="number" id="regularCount" class="swal2-input" min="0" value="0" />
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium mb-1">Senior/Student (₱130)</label>
            <input type="number" id="seniorCount" class="swal2-input" min="0" value="0" />
          </div>
          <div>
            <label class="flex items-center">
              <input type="checkbox" id="addToQueue" class="mr-2" checked />
              <span class="text-sm">Add driver back to queue</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Record",
      cancelButtonText: "Cancel",
      preConfirm: () => ({
        regular: parseInt(document.getElementById('regularCount').value) || 0,
        senior: parseInt(document.getElementById('seniorCount').value) || 0,
        addToQueue: document.getElementById('addToQueue').checked
      })
    });

    if (!formValues) return;

    try {
      const result = await queueAPI.recordTrip(transactionId, formValues.regular, formValues.senior, formValues.addToQueue);
      Swal.fire({ title: "Recorded!", html: `Total: ₱${result.transaction.totalFare}`, icon: "success" });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message, icon: "error" });
    }
  };

  const handleDispatch = async (id, driverName, bodyNo) => {
    const { value: origin } = await Swal.fire({
      title: `Dispatch ${driverName}`,
      input: "text",
      inputLabel: "Route Origin (optional)",
      inputPlaceholder: TERMINAL,
      showCancelButton: true,
      confirmButtonText: "Next →",
    });

    let routeData = null;
    if (origin) {
      const { value: destination } = await Swal.fire({
        title: "Route Destination",
        input: "text",
        inputLabel: "Destination",
        inputPlaceholder: MAIN_DEST,
        showCancelButton: true,
        confirmButtonText: "Get Route →",
      });
      if (destination) {
        try {
          Swal.fire({
            title: "Fetching route…",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });
          routeData = await fareAPI.getRoute(origin || TERMINAL, destination);
          Swal.close();
          const r = routeData.route;
          const f = routeData.fare;
          const { isConfirmed } = await Swal.fire({
            title: "Route & Fare Preview",
            html: `
              <div class="text-start">
                <p><strong><i class="fa-solid fa-location-dot"></i> ${r.origin}</strong><br/>→ ${r.destination}</p>
                <p><i class="fa-solid fa-road"></i> <strong>Distance:</strong> ${r.distanceText} (${r.distanceKm} km)<br/>
                   <i class="fa-solid fa-clock"></i> <strong>ETA (with traffic):</strong> ${r.durationInTrafficText}<br/>
                   <i class="fa-solid fa-traffic-light"></i> <strong>Congestion:</strong> ${r.congestion?.toUpperCase()}</p>
                <hr/>
                <p><i class="fa-solid fa-peso-sign"></i> <strong>Fare per Passenger:</strong> ₱${f.farePerPassenger.toFixed(2)}<br/>
                   <small class="text-muted">${f.breakdown}</small></p>
                <p><i class="fa-solid fa-tag"></i> <strong>Terminal Fee:</strong> ₱${f.terminalFee.toFixed(2)}</p>
              </div>`,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "✅ Dispatch Now",
          });
          if (!isConfirmed) return;
        } catch (err) {
          Swal.close();
        }
      }
    } else {
      const { isConfirmed } = await Swal.fire({
        title: "Dispatch Driver?",
        html: `Dispatch <strong>${driverName}</strong> (Body #${bodyNo})?<br/><small class="text-muted">Terminal fee: ₱${fareMatrix?.terminal_fee?.toFixed(2) || "10.00"}</small>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Dispatch",
      });
      if (!isConfirmed) return;
    }

    try {
      await queueAPI.dispatch(
        id,
        routeData
          ? {
              estimatedMinutes: routeData.route?.durationMinutes,
              origin: routeData.route?.origin,
              destination: routeData.route?.destination,
              distanceKm: routeData.route?.distanceKm,
              polyline: routeData.route?.polyline,
            }
          : {},
      );
      Swal.fire({
        title: "Dispatched!",
        text: "Driver is now on-trip.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message || "Failed to dispatch", icon: "error" });
    }
  };

  const handleRegisterTrip = async () => {
    try {
      const driversRes = await queueAPI.getDrivers();
      const drivers = driversRes.drivers || [];
      if (drivers.length === 0) {
        Swal.fire({ title: "No Drivers", text: "No drivers available.", icon: "info" });
        return;
      }
      const { value: driverId } = await Swal.fire({
        title: "Select Driver",
        input: "select",
        inputOptions: drivers.reduce((acc, d) => {
          acc[d._id] = `${d.name} (${d.username})`;
          return acc;
        }, {}),
        inputPlaceholder: "Select a driver",
        showCancelButton: true,
        confirmButtonText: "Register Trip",
      });
      if (!driverId) return;
      await queueAPI.registerTrip(driverId);
      Swal.fire({
        title: "Trip Registered!",
        text: "Driver dispatched (skipped queue).",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message || "Failed to register trip", icon: "error" });
    }
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker Dispatch
            </span>
            <span className="text-white/75 text-sm hidden sm:block">Dispatcher: {user.name || user.email}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/maps")}
                className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                <i className="fa-solid fa-map mr-1"></i> Maps
              </button>
              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                <i className="fa-solid fa-chart-bar mr-1"></i> Reports
              </button>
              <button type="button" onClick={logout} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition">
                <i className="fa-solid fa-sign-out-alt mr-1"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md text-center py-4">
            <i className="fa-solid fa-money-bill-wave text-3xl text-green-600 mb-2"></i>
            <h4 className="font-bold text-xl text-green-600">₱{parseFloat(todayTotal).toFixed(2)}</h4>
            <small className="text-gray-500">Fees Today</small>
          </div>
          <div className="bg-white rounded-xl shadow-md text-center py-4">
            <i className="fa-solid fa-car text-3xl text-indigo-900 mb-2"></i>
            <h4 className="font-bold text-xl text-indigo-900">{todayTrips}</h4>
            <small className="text-gray-500">Trips Today</small>
          </div>
          <div className="bg-white rounded-xl shadow-md text-center py-4">
            <i className="fa-solid fa-hourglass-half text-3xl text-orange-500 mb-2"></i>
            <h4 className="font-bold text-xl text-orange-500">{activeQueue.length}</h4>
            <small className="text-gray-500">In Queue</small>
          </div>
          <div className="bg-white rounded-xl shadow-md text-center py-4">
            <i className="fa-solid fa-tag text-3xl text-gray-600 mb-2"></i>
            <h4 className="font-bold text-xl text-gray-600">
              ₱{fareMatrix?.terminal_fee?.toFixed(2) || "10.00"}
            </h4>
            <small className="text-gray-500">Terminal Fee</small>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h6 className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-traffic-light text-orange-500"></i> Traffic Conditions
                </h6>
                <button
                  onClick={loadTraffic}
                  disabled={trafficLoading}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <i className={`fa-solid fa-rotate ${trafficLoading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
              {traffic ? (
                <div
                  className="p-3 rounded-lg"
                  style={{ background: congestionBg(traffic.congestion_level) }}
                >
                  <strong style={{ color: congestionColor(traffic.congestion_level) }}>
                    {traffic.congestion_level?.toUpperCase()} TRAFFIC
                  </strong>
                  <p className="text-sm mt-1 text-gray-600">
                    <i className="fa-solid fa-road mr-1"></i> {traffic.distance} &nbsp;|&nbsp; <i className="fa-solid fa-clock mr-1"></i> {traffic.duration_in_traffic}
                  </p>
                  <small className="text-gray-500 block mt-1">
                    {traffic.origin} → {traffic.destination}
                  </small>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {trafficLoading ? "Loading…" : "Click ↻ to refresh"}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <h6 className="font-bold mb-3 flex items-center gap-2">
                <i className="fa-solid fa-bolt text-yellow-500"></i> Actions
              </h6>
              <button
                type="button"
                onClick={handleRegisterTrip}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium mb-2 transition"
              >
                <i className="fa-solid fa-plus mr-2"></i> Register New Trip
              </button>
              <button
                type="button"
                onClick={() => navigate("/maps")}
                className="w-full border-2 border-indigo-900 text-indigo-900 hover:bg-indigo-50 py-2 rounded-lg font-medium mb-2 transition"
              >
                <i className="fa-solid fa-map mr-2"></i> Open Maps & Routes
              </button>
              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="w-full border-2 border-gray-400 text-gray-600 hover:bg-gray-50 py-2 rounded-lg transition"
              >
                <i className="fa-solid fa-chart-bar mr-2"></i> View Reports
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md">
              <div className="px-4 py-3 border-b">
                <h6 className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-truck text-blue-500"></i> Active Trips Tracking
                </h6>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {trackingQueue.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">No active trips</p>
                ) : (
                  <div className="divide-y">
                    {trackingQueue.map((entry) => (
                      <div key={entry._id} className="px-4 py-3">
                        <div className="flex justify-between">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${entry.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {entry.status}
                            </span>
                            <div className="font-medium text-sm mt-1">{entry.driverId?.name || "Driver"}</div>
                            <div className="text-xs text-gray-500">
                              Body #{entry.vehicleId?.bodyNumber || "N/A"}
                            </div>
                            {entry.currentLat && entry.currentLng && (
                              <div className="text-xs text-gray-500">
                                <i className="fa-solid fa-location-dot mr-1"></i> {entry.currentLat.toFixed(4)}, {entry.currentLng.toFixed(4)}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {entry.dispatchTime
                              ? new Date(entry.dispatchTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                            {entry.lastLocationUpdate && (
                              <div className="text-xs">
                                Updated: {new Date(entry.lastLocationUpdate).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md">
              <div className="px-4 py-3 border-b">
                <h6 className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock text-gray-600"></i> Recently Dispatched
                </h6>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recentQueue.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">No recent dispatches</p>
                ) : (
                  <div className="divide-y">
                    {recentQueue.map((entry) => (
                      <div key={entry._id} className="px-4 py-3">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium text-sm">{entry.driverId?.name || "Driver"}</div>
                            <div className="text-xs text-gray-500">
                              Body #{entry.vehicleId?.bodyNumber || "N/A"}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.dispatchTime
                              ? new Date(entry.dispatchTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h5 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-clipboard-list text-indigo-900"></i> Active Queue (FIFO)
              </h5>
              <span className="bg-indigo-900 text-white px-3 py-1 rounded-full text-sm">{activeQueue.length} waiting</span>
            </div>

            {activeQueue.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md text-center py-12">
                <i className="fa-solid fa-car-side text-4xl text-gray-300 mb-3"></i>
                <p className="text-gray-500">No drivers in queue</p>
              </div>
            ) : (
              <>
                {activeQueue[0] && (
                  <div
                    className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-xl shadow-lg mb-4 p-5"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium mb-2 inline-block">NEXT IN LINE</span>
                        <h4 className="font-bold text-2xl">
                          Body #{activeQueue[0].vehicleId?.bodyNumber || "N/A"}
                        </h4>
                        <p className="opacity-75">
                          Driver: {activeQueue[0].driverId?.name || "Unknown"}
                        </p>
                        <small className="opacity-50">
                          Checked in: {new Date(activeQueue[0].checkInTime).toLocaleTimeString()}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="bg-white text-indigo-900 hover:bg-gray-100 font-bold py-3 px-6 rounded-xl transition"
                        onClick={() =>
                          handleDispatch(
                            activeQueue[0]._id,
                            activeQueue[0].driverId?.name || "Driver",
                            activeQueue[0].vehicleId?.bodyNumber || "N/A",
                          )
                        }
                      >
                        <i className="fa-solid fa-rocket mr-2"></i> DISPATCH
                      </button>
                    </div>
                  </div>
                )}

                {activeQueue.slice(1).map((entry, i) => {
                  const waited = Math.floor(
                    (Date.now() - new Date(entry.checkInTime).getTime()) / 60000,
                  );
                  return (
                    <div
                      key={entry._id || i}
                      className="bg-white rounded-lg shadow-sm mb-2 p-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="bg-gray-400 text-white px-2 py-0.5 rounded text-xs mr-2">#{i + 2}</span>
                          <span className="font-medium">Body #{entry.vehicleId?.bodyNumber || "N/A"}</span>
                          <span className="text-gray-500 text-sm ml-2">
                            {entry.driverId?.name || "Unknown"}
                          </span>
                        </div>
                        <small className="text-gray-500">Waited {waited}m</small>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          {pendingTrips.length > 0 && (
            <div className="mt-4 bg-white rounded-xl shadow-md">
              <div className="px-4 py-3 border-b bg-orange-50">
                <h6 className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock text-orange-600"></i> Pending ({pendingTrips.length})
                </h6>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto">
                {pendingTrips.map((trip) => (
                  <div key={trip._id} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{trip.driverId?.name || 'Driver'}</div>
                      <div className="text-xs text-gray-500">Route: {trip.queueId?.routeTaken || 'N/A'}</div>
                    </div>
                    <button onClick={() => handleRecordTrip(trip._id, trip.driverId?.name, trip.queueId?.routeTaken)} className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm">Record</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatcherDashboard;