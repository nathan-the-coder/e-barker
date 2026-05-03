/** biome-ignore-all assist/source/organizeImports: <explanation> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <explanation> */
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
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fareMatrix, setFareMatrix] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  const TERMINAL = "San Jose, Baggao, Cagayan";
  const MAIN_DEST = "Tuguegarao City, Cagayan";

  const loadData = async () => {
    try {
      const [active, recent, today, matrix] = await Promise.all([
        queueAPI.getActive(),
        queueAPI.getRecent(),
        transactionAPI.getToday(),
        fareAPI.getMatrix(),
      ]);
      setActiveQueue(active.queue || []);
      setRecentQueue(recent.queue || []);
      setTodayTotal(today.total || 0);
      setTodayTrips((today.transactions || []).length);
      setFareMatrix(matrix.matrix);
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
    const tv = setInterval(loadTraffic, 120000); // refresh traffic every 2 min
    return () => {
      clearInterval(iv);
      clearInterval(tv);
    };
  }, [user]);

  const congestionColor = (level) =>
    level === "heavy" ? "#d32f2f" : level === "moderate" ? "#f57c00" : "#388e3c";

  const congestionBg = (level) =>
    level === "heavy" ? "#ffebee" : level === "moderate" ? "#fff3e0" : "#e8f5e9";

  const handleDispatch = async (id, driverName, bodyNo) => {
    // Ask for optional route info
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
                <p><strong>📍 ${r.origin}</strong><br/>→ ${r.destination}</p>
                <p>📏 <strong>Distance:</strong> ${r.distanceText} (${r.distanceKm} km)<br/>
                   ⏱ <strong>ETA (with traffic):</strong> ${r.durationInTrafficText}<br/>
                   🚦 <strong>Congestion:</strong> ${r.congestion?.toUpperCase()}</p>
                <hr/>
                <p>💰 <strong>Fare per Passenger:</strong> ₱${f.farePerPassenger.toFixed(2)}<br/>
                   <small class="text-muted">${f.breakdown}</small></p>
                <p>🏷 <strong>Terminal Fee:</strong> ₱${f.terminalFee.toFixed(2)}</p>
              </div>`,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "✅ Dispatch Now",
          });
          if (!isConfirmed) return;
        } catch (err) {
          Swal.close();
          // If route fetch fails, continue with plain dispatch
        }
      }
    } else {
      // Plain dispatch confirmation
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
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb" }}>
      {/* Navbar */}
      <nav
        className="navbar navbar-dark"
        style={{ background: "linear-gradient(135deg,#1a237e,#283593)" }}
      >
        <div className="container">
          <span className="navbar-brand fw-bold">🚐 E-Barker Dispatch</span>
          <span className="text-white opacity-75 small">Dispatcher: {user.name || user.email}</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/maps")}
              className="btn btn-sm btn-outline-light"
            >
              🗺 Maps
            </button>
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="btn btn-sm btn-outline-light"
            >
              📊 Reports
            </button>
            <button type="button" onClick={logout} className="btn btn-sm btn-danger">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        {/* Stats row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
              <div style={{ fontSize: 28 }}>💰</div>
              <h4 className="fw-bold mb-0 text-success">₱{parseFloat(todayTotal).toFixed(2)}</h4>
              <small className="text-muted">Fees Today</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
              <div style={{ fontSize: 28 }}>🚗</div>
              <h4 className="fw-bold mb-0 text-primary">{todayTrips}</h4>
              <small className="text-muted">Trips Today</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
              <div style={{ fontSize: 28 }}>⏳</div>
              <h4 className="fw-bold mb-0 text-warning">{activeQueue.length}</h4>
              <small className="text-muted">In Queue</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm text-center py-3" style={{ borderRadius: 14 }}>
              <div style={{ fontSize: 28 }}>🏷</div>
              <h4 className="fw-bold mb-0 text-secondary">
                ₱{fareMatrix?.terminal_fee?.toFixed(2) || "10.00"}
              </h4>
              <small className="text-muted">Terminal Fee</small>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left column */}
          <div className="col-md-4">
            {/* Traffic widget */}
            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
              <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">🚦 Traffic Conditions</h6>
                <button
                  onClick={loadTraffic}
                  disabled={trafficLoading}
                  className="btn btn-sm btn-outline-secondary"
                  style={{ borderRadius: 50 }}
                >
                  {trafficLoading ? "…" : "↻"}
                </button>
              </div>
              <div className="card-body pt-0">
                {traffic ? (
                  <div
                    className="p-2 rounded"
                    style={{ background: congestionBg(traffic.congestion_level) }}
                  >
                    <strong style={{ color: congestionColor(traffic.congestion_level) }}>
                      {traffic.congestion_level?.toUpperCase()} TRAFFIC
                    </strong>
                    <p className="mb-1 mt-1 small">
                      📏 {traffic.distance} &nbsp;|&nbsp; ⏱ {traffic.duration_in_traffic}
                    </p>
                    <small className="text-muted">
                      {traffic.origin} → {traffic.destination}
                    </small>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">
                    {trafficLoading ? "Loading…" : "Click ↻ to refresh"}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
              <div className="card-body">
                <h6 className="fw-bold mb-3">⚡ Actions</h6>
                <button
                  type="button"
                  onClick={handleRegisterTrip}
                  className="btn btn-success w-100 mb-2 fw-semibold"
                >
                  ＋ Register New Trip
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/maps")}
                  className="btn btn-outline-primary w-100 mb-2"
                >
                  🗺 Open Maps & Routes
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="btn btn-outline-secondary w-100"
                >
                  📊 View Reports
                </button>
              </div>
            </div>

            {/* Recently dispatched */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-header bg-white border-0 py-3">
                <h6 className="mb-0 fw-bold">🕐 Recently Dispatched</h6>
              </div>
              <div className="card-body p-0">
                {recentQueue.length === 0 ? (
                  <p className="text-center text-muted py-3 small">No recent dispatches</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {recentQueue.map((entry) => (
                      <div key={entry._id} className="list-group-item px-3 py-2">
                        <div className="d-flex justify-content-between">
                          <div>
                            <strong className="small">{entry.driverId?.name || "Driver"}</strong>
                            <br />
                            <small className="text-muted">
                              Body #{entry.vehicleId?.bodyNumber || "N/A"}
                            </small>
                          </div>
                          <small className="text-muted">
                            {entry.dispatchTime
                              ? new Date(entry.dispatchTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column – active queue */}
          <div className="col-md-8">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">📋 Active Queue (FIFO)</h5>
              <span className="badge bg-primary fs-6">{activeQueue.length} waiting</span>
            </div>

            {activeQueue.length === 0 ? (
              <div
                className="card border-0 shadow-sm text-center py-5"
                style={{ borderRadius: 14 }}
              >
                <p className="text-muted mb-0">No drivers in queue</p>
              </div>
            ) : (
              <>
                {/* Next in line — big card */}
                {activeQueue[0] && (
                  <div
                    className="card border-0 shadow mb-3"
                    style={{
                      borderRadius: 14,
                      background: "linear-gradient(135deg,#1a237e,#283593)",
                      color: "#fff",
                    }}
                  >
                    <div className="card-body d-flex justify-content-between align-items-center p-4">
                      <div>
                        <span className="badge bg-success mb-2">NEXT IN LINE</span>
                        <h4 className="mb-0 fw-bold">
                          Body #{activeQueue[0].vehicleId?.bodyNumber || "N/A"}
                        </h4>
                        <p className="mb-0 opacity-75">
                          Driver: {activeQueue[0].driverId?.name || "Unknown"}
                        </p>
                        <small className="opacity-50">
                          Checked in: {new Date(activeQueue[0].checkInTime).toLocaleTimeString()}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-light btn-lg fw-bold"
                        style={{ borderRadius: 12, color: "#1a237e", minWidth: 120 }}
                        onClick={() =>
                          handleDispatch(
                            activeQueue[0]._id,
                            activeQueue[0].driverId?.name || "Driver",
                            activeQueue[0].vehicleId?.bodyNumber || "N/A",
                          )
                        }
                      >
                        🚀 DISPATCH
                      </button>
                    </div>
                  </div>
                )}

                {/* Rest of the queue */}
                {activeQueue.slice(1).map((entry, i) => {
                  const waited = Math.floor(
                    (Date.now() - new Date(entry.checkInTime).getTime()) / 60000,
                  );
                  return (
                    <div
                      key={entry._id || i}
                      className="card border-0 shadow-sm mb-2"
                      style={{ borderRadius: 12 }}
                    >
                      <div className="card-body d-flex justify-content-between align-items-center py-2 px-3">
                        <div>
                          <span className="badge bg-secondary me-2">#{i + 2}</span>
                          <strong>Body #{entry.vehicleId?.bodyNumber || "N/A"}</strong>
                          <small className="text-muted ms-2">
                            {entry.driverId?.name || "Unknown"}
                          </small>
                        </div>
                        <small className="text-muted">Waited {waited}m</small>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatcherDashboard;
