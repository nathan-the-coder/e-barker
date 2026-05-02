/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <explanation> */
import Swal from "sweetalert2";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { queueAPI, fareAPI } from "../utils/api";

function DriverPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [queueStatus, setQueueStatus] = useState(null);
  const [activeQueue, setActiveQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripElapsed, setTripElapsed] = useState(0);
  const [fareMatrix, setFareMatrix] = useState(null);
  const timerRef = useRef(null);

  const getDriverId = () => user?.id || user?._id;

  const loadData = async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const [status, queue, matrix] = await Promise.all([
        queueAPI.getMyStatus(driverId),
        queueAPI.getActive(),
        fareAPI.getMatrix(),
      ]);
      setQueueStatus(status.status);
      setActiveQueue(queue.queue || []);
      setFareMatrix(matrix.matrix);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  };

  // Live trip timer
  useEffect(() => {
    if (queueStatus?.status === "On-trip" && queueStatus?.dispatchTime) {
      timerRef.current = setInterval(() => {
        setTripElapsed(
          Math.floor((Date.now() - new Date(queueStatus.dispatchTime).getTime()) / 1000)
        );
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setTripElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [queueStatus?.status, queueStatus?.dispatchTime]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "driver") {
      navigate(user.role === "dispatcher" ? "/dashboard" : "/admin");
      return;
    }
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const handleJoinQueue = async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const vehicleId = user?.vehicleId?._id || user?.vehicleId;
      const res = await queueAPI.join(driverId, vehicleId);
      Swal.fire({ title: "Joined Queue!", html: `Position <strong>#${res.position}</strong>`, icon: "success" });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message || "Failed to join queue", icon: "error" });
    }
  };

  const handleCompleteTrip = async () => {
    if (!queueStatus || queueStatus.status !== "On-trip") return;
    const { isConfirmed } = await Swal.fire({
      title: "Complete Trip?",
      text: "Confirm that you have returned to the terminal.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Complete",
    });
    if (!isConfirmed) return;
    try {
      await queueAPI.complete(queueStatus._id || queueStatus.id);
      Swal.fire({ title: "Trip Completed!", text: "You are now back in the queue.", icon: "success" });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message || "Failed to complete trip", icon: "error" });
    }
  };

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h > 0 ? h : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
      .filter(Boolean).join(":");
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const position = activeQueue.findIndex(
    (q) => (q.driverId?._id || q.driverId) === getDriverId()
  ) + 1;
  const estFare = fareMatrix
    ? `₱${fareMatrix.base_fare.toFixed(2)} base + ₱${fareMatrix.per_km_rate.toFixed(2)}/km`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb" }}>
      <nav className="navbar navbar-dark" style={{ background: "linear-gradient(135deg,#1a237e,#283593)" }}>
        <div className="container">
          <span className="navbar-brand fw-bold">🚐 E-Barker</span>
          <span className="text-white opacity-75 small">Driver: {user.name || user.email}</span>
          <button type="button" onClick={logout} className="btn btn-sm btn-outline-light">Logout</button>
        </div>
      </nav>

      <div className="container py-4">
        <div className="row g-4 justify-content-center">

          {/* Status card */}
          <div className="col-12 col-lg-5">
            {!queueStatus ? (
              <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: 18 }}>
                <div className="card-body">
                  <div style={{ fontSize: 56 }}>🛺</div>
                  <h4 className="mt-3 fw-bold text-muted">Not in Queue</h4>
                  <p className="text-muted mb-1">Join to start accepting trips.</p>
                  {estFare && <p className="small text-muted mb-4"><strong>Fare Rate:</strong> {estFare}</p>}
                  <button type="button" onClick={handleJoinQueue}
                    className="btn btn-success btn-lg px-5 fw-semibold" style={{ borderRadius: 50 }}>
                    ✅ Join Queue
                  </button>
                </div>
              </div>
            ) : queueStatus.status === "Waiting" ? (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 18 }}>
                <div className="card-body text-center py-4">
                  <span className="badge bg-warning text-dark fs-6 mb-3">⏳ Waiting</span>
                  <h2 className="fw-bold display-4 text-primary">#{position || "—"}</h2>
                  <p className="text-muted">Your position in queue</p>
                  <hr />
                  <div className="row g-2 mt-1">
                    <div className="col">
                      <small className="text-muted d-block">Checked In</small>
                      <strong>{new Date(queueStatus.checkInTime).toLocaleTimeString()}</strong>
                    </div>
                     <div className="col">
                       <small className="text-muted d-block">Vehicle</small>
                       <strong>{queueStatus.vehicleId?.bodyNumber || "—"}</strong>
                     </div>
                  </div>
                  {estFare && (
                    <div className="alert alert-info mt-3 mb-0 small text-start">
                      <strong>Fare Rate:</strong> {estFare}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow text-white" style={{ borderRadius: 18, background: "linear-gradient(135deg,#1b5e20,#2e7d32)" }}>
                <div className="card-body text-center py-4">
                  <div style={{ fontSize: 48 }}>🚗</div>
                  <h4 className="fw-bold mt-2 mb-0">On Trip!</h4>
                  <p className="opacity-75 small mb-3">Currently on a trip</p>
                  <div className="mb-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <small className="opacity-75 d-block">Trip Duration</small>
                    <span style={{ fontSize: 36, fontFamily: "monospace", fontWeight: 700 }}>
                      {formatElapsed(tripElapsed)}
                    </span>
                  </div>
                  <div className="row g-2 mb-4">
                    <div className="col">
                      <small className="opacity-75 d-block">Dispatched</small>
                      <strong>{queueStatus.dispatchTime ? new Date(queueStatus.dispatchTime).toLocaleTimeString() : "—"}</strong>
                    </div>
                    <div className="col">
                      <small className="opacity-75 d-block">Est. ETA</small>
                      <strong>{queueStatus.estimatedArrivalTime ? `${queueStatus.estimatedArrivalTime} min` : "—"}</strong>
                    </div>
                  </div>
                  <button type="button" onClick={handleCompleteTrip}
                    className="btn btn-light btn-lg fw-bold px-5" style={{ borderRadius: 50, color: "#1b5e20" }}>
                    ✅ Complete Trip
                  </button>
                  <p className="opacity-75 small mt-3 mb-0">Return to terminal first, then tap Complete.</p>
                </div>
              </div>
            )}
          </div>

          {/* Queue list */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 18 }}>
              <div className="card-header bg-white border-0 py-3 px-4" style={{ borderRadius: "18px 18px 0 0" }}>
                <h5 className="mb-0 fw-bold">📋 Current Queue</h5>
                <small className="text-muted">{activeQueue.length} driver{activeQueue.length !== 1 ? "s" : ""} waiting</small>
              </div>
              <div className="card-body p-0">
                {activeQueue.length === 0 ? (
                  <p className="text-center text-muted py-4">No drivers in queue</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {activeQueue.map((entry, index) => {
                      const isMe = (entry.driverId?._id || entry.driverId) === getDriverId();
                      const waited = Math.floor((Date.now() - new Date(entry.checkInTime).getTime()) / 60000);
                      return (
                        <div key={entry._id || index} className="list-group-item px-4 py-3"
                          style={{
                            background: index === 0 ? "#e8f5e9" : isMe ? "#fff3e0" : "white",
                            borderLeft: `4px solid ${index === 0 ? "#4caf50" : isMe ? "#ff9800" : "transparent"}`
                          }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge me-2" style={{ background: index === 0 ? "#4caf50" : "#90a4ae", color: "#fff" }}>
                                #{index + 1}
                              </span>
                              <strong>{entry.driverId?.name || `Driver #${index + 1}`}</strong>
                              {isMe && <span className="badge bg-warning text-dark ms-2">You</span>}
                              {index === 0 && <span className="badge bg-success ms-2">Next</span>}
                              <br />
                              <small className="text-muted ms-4">
                                 Body #{entry.vehicleId?.bodyNumber || "—"} · waited {waited}m
                              </small>
                            </div>
                            <small className="text-muted">
                              {new Date(entry.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default DriverPage;
