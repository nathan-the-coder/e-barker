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
  const locationTimerRef = useRef(null);

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
    if (queueStatus?.status === "Confirmed") {
      handleGetLocation();
      locationTimerRef.current = setInterval(handleGetLocation, 30000);
    } else {
      clearInterval(locationTimerRef.current);
    }
    return () => clearInterval(locationTimerRef.current);
  }, [queueStatus?.status]);

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

  const handleConfirmTrip = async () => {
    if (!queueStatus || queueStatus.status !== "On-trip") return;
    const { isConfirmed } = await Swal.fire({
      title: "Confirm Trip?",
      text: "Acknowledge that you have received the dispatch and are starting the trip.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Confirm",
    });
    if (!isConfirmed) return;
    try {
      await queueAPI.confirm(queueStatus._id || queueStatus.id);
      Swal.fire({ title: "Trip Confirmed!", text: "Tracking enabled.", icon: "success" });
      loadData();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message || "Failed to confirm", icon: "error" });
    }
  };

  const sendLocation = async (lat, lng) => {
    if (!queueStatus || (!queueStatus._id && !queueStatus.id)) return;
    try {
      await queueAPI.updateLocation(queueStatus._id || queueStatus.id, lat, lng);
    } catch (err) {
      console.error("Location update failed:", err);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendLocation(latitude, longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCompleteTrip = async () => {
    if (!queueStatus || (queueStatus.status !== "On-trip" && queueStatus.status !== "Confirmed")) return;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-indigo-900 text-xl">
          <i className="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p>Loading...</p>
        </div>
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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker
            </span>
            <span className="text-white/75 text-sm hidden sm:block">Driver: {user.name || user.email}</span>
            <button type="button" onClick={logout} className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition">
              <i className="fa-solid fa-sign-out-alt mr-1"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 justify-center">
          <div className="lg:col-span-2">
            {!queueStatus ? (
              <div className="bg-white rounded-xl shadow-md text-center py-8 px-6">
                <i className="fa-solid fa-taxi text-5xl text-gray-300 mb-4"></i>
                <h4 className="mt-3 font-bold text-gray-600 text-xl">Not in Queue</h4>
                <p className="text-gray-500 mb-1">Join to start accepting trips.</p>
                {estFare && <p className="text-sm text-gray-500 mb-4"><strong>Fare Rate:</strong> {estFare}</p>}
                <button type="button" onClick={handleJoinQueue}
                  className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3 rounded-full font-semibold transition">
                  <i className="fa-solid fa-check mr-2"></i> Join Queue
                </button>
              </div>
            ) : queueStatus.status === "Waiting" ? (
              <div className="bg-white rounded-xl shadow-md">
                <div className="text-center py-6 px-6">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-3 inline-block">
                    <i className="fa-solid fa-hourglass-half mr-1"></i> Waiting
                  </span>
                  <h2 className="font-bold text-5xl text-indigo-900">#{position || "—"}</h2>
                  <p className="text-gray-500">Your position in queue</p>
                  <hr className="my-4" />
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <small className="text-gray-500 block">Checked In</small>
                      <strong>{new Date(queueStatus.checkInTime).toLocaleTimeString()}</strong>
                    </div>
                     <div>
                      <small className="text-gray-500 block">Vehicle</small>
                      <strong>{queueStatus.vehicleId?.bodyNumber || "—"}</strong>
                    </div>
                  </div>
                  {estFare && (
                    <div className="bg-blue-50 mt-4 p-3 rounded-lg text-left text-sm">
                      <strong>Fare Rate:</strong> {estFare}
                    </div>
                  )}
                </div>
              </div>
            ) : queueStatus.status === "On-trip" ? (
              <div className="bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-xl shadow-lg">
                <div className="text-center py-6 px-6">
                  <i className="fa-solid fa-satellite-dish text-4xl mb-2"></i>
                  <h4 className="font-bold text-2xl mb-0">Dispatch Received!</h4>
                  <p className="opacity-75 text-sm mb-3">Confirm to start trip</p>
                  <div className="mb-3 p-4 rounded-lg bg-white/15">
                    <small className="opacity-75 block">Dispatched At</small>
                    <strong style={{ fontSize: 24 }}>
                      {queueStatus.dispatchTime ? new Date(queueStatus.dispatchTime).toLocaleTimeString() : "—"}
                    </strong>
                  </div>
                  <div className="grid grid-cols-1 mb-4">
                    <div>
                      <small className="opacity-75 block">Est. ETA</small>
                      <strong>{queueStatus.estimatedArrivalTime ? `${queueStatus.estimatedArrivalTime} min` : "—"}</strong>
                    </div>
                  </div>
                  <button type="button" onClick={handleConfirmTrip}
                    className="bg-white text-orange-500 hover:bg-gray-100 font-bold py-3 px-8 rounded-full transition">
                    <i className="fa-solid fa-check mr-2"></i> Confirm Trip
                  </button>
                  <p className="opacity-75 text-sm mt-3 mb-0">Tap Confirm to acknowledge dispatch.</p>
                </div>
              </div>
            ) : queueStatus.status === "Confirmed" ? (
              <div className="bg-gradient-to-br from-green-700 to-green-600 text-white rounded-xl shadow-lg">
                <div className="text-center py-6 px-6">
                  <i className="fa-solid fa-car text-4xl mb-2"></i>
                  <h4 className="font-bold text-2xl mb-0">On Trip!</h4>
                  <p className="opacity-75 text-sm mb-3">Currently on a trip</p>
                  <div className="mb-3 p-4 rounded-lg bg-white/15">
                    <small className="opacity-75 block">Trip Duration</small>
                    <span style={{ fontSize: 36, fontFamily: "monospace", fontWeight: 700 }}>
                      {formatElapsed(tripElapsed)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 mb-4">
                    <div>
                      <small className="opacity-75 block">Dispatched</small>
                      <strong>{queueStatus.dispatchTime ? new Date(queueStatus.dispatchTime).toLocaleTimeString() : "—"}</strong>
                    </div>
                    <div>
                      <small className="opacity-75 block">Est. ETA</small>
                      <strong>{queueStatus.estimatedArrivalTime ? `${queueStatus.estimatedArrivalTime} min` : "—"}</strong>
                    </div>
                  </div>
                  <button type="button" onClick={handleCompleteTrip}
                    className="bg-white text-green-700 hover:bg-gray-100 font-bold py-3 px-8 rounded-full transition">
                    <i className="fa-solid fa-check mr-2"></i> Complete Trip
                  </button>
                  <p className="opacity-75 text-sm mt-3 mb-0">Return to terminal first, then tap Complete.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md text-center py-8">
                <div className="card-body">
                  <p className="text-gray-500">Unknown status</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md">
              <div className="px-5 py-4 border-b">
                <h5 className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-indigo-900"></i> Current Queue
                </h5>
                <small className="text-gray-500">{activeQueue.length} driver{activeQueue.length !== 1 ? "s" : ""} waiting</small>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {activeQueue.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">No drivers in queue</p>
                ) : (
                  <div className="divide-y">
                    {activeQueue.map((entry, index) => {
                      const isMe = (entry.driverId?._id || entry.driverId) === getDriverId();
                      const waited = Math.floor((Date.now() - new Date(entry.checkInTime).getTime()) / 60000);
                      return (
                        <div key={entry._id || index} className="px-5 py-4"
                          style={{
                            background: index === 0 ? "#e8f5e9" : isMe ? "#fff3e0" : "white",
                            borderLeft: `4px solid ${index === 0 ? "#4caf50" : isMe ? "#ff9800" : "transparent"}`
                          }}>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium mr-2" style={{ background: index === 0 ? "#4caf50" : "#90a4ae", color: "#fff" }}>
                                #{index + 1}
                              </span>
                              <strong>{entry.driverId?.name || `Driver #${index + 1}`}</strong>
                              {isMe && <span className="bg-yellow-500 text-white px-2 py-0.5 rounded text-xs ml-2">You</span>}
                              {index === 0 && <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs ml-2">Next</span>}
                              <br />
                              <small className="text-gray-500 ml-4">
                                 Body #{entry.vehicleId?.bodyNumber || "—"} · waited {waited}m
                              </small>
                            </div>
                            <small className="text-gray-500">
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