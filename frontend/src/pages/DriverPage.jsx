import Swal from "sweetalert2";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { queueAPI, fareAPI } from "../utils/api";

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

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
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  const [activeTab, setActiveTab] = useState("queue");
  const [trips, setTrips] = useState([]);
  const [tripsSummary, setTripsSummary] = useState({ todayEarnings: 0, weekEarnings: 0, totalTrips: 0 });
  const [tripRoute, setTripRoute] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

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

  const loadTrips = async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const data = await queueAPI.getMyTrips(driverId);
      setTrips(data.trips || []);
      setTripsSummary(data.summary || { todayEarnings: 0, weekEarnings: 0, totalTrips: 0 });
    } catch (err) {
      console.error("Error loading trips:", err);
    }
  };

  const loadRoute = async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const data = await queueAPI.getMyRoute(driverId);
      setTripRoute(data.trip);
    } catch (err) {
      console.error("Error loading route:", err);
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

  useEffect(() => {
    if (activeTab === "trips") {
      loadTrips();
    } else if (activeTab === "map") {
      loadRoute();
      if (!mapsLoaded && GMAPS_API_KEY) {
        loadGoogleMaps();
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "map" && mapsLoaded && mapInstanceRef.current) {
      updateMapDisplay();
    }
  }, [tripRoute, mapsLoaded]);

  useEffect(() => {
    if (activeTab === "map" && mapsLoaded) {
      const routeInterval = setInterval(() => {
        loadRoute();
      }, 15000);
      return () => clearInterval(routeInterval);
    }
  }, [activeTab, mapsLoaded, tripRoute]);

  const loadGoogleMaps = () => {
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }
    if (!GMAPS_API_KEY) return;

    const existing = document.getElementById("gmaps-script-driver");
    if (existing) {
      existing.onload = () => setMapsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "gmaps-script-driver";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  };

  const initMap = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    const terminalLocation = { lat: 17.9483, lng: 121.7886 };
    new window.google.maps.Map(document.getElementById("driver-map"), {
      center: terminalLocation,
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
    });
  };

  const updateMapDisplay = () => {
    if (!window.google?.maps || !tripRoute) return;

    const mapDiv = document.getElementById("driver-map");
    if (!mapDiv) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapDiv, {
        center: { lat: 17.9483, lng: 121.7886 },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
      });
    }

    const map = mapInstanceRef.current;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
    }

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    const hasLocation = tripRoute.currentLat && tripRoute.currentLng;
    const hasHistory = tripRoute.locationHistory?.length > 0;

    if (hasLocation) {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: { lat: tripRoute.currentLat, lng: tripRoute.currentLng },
        map: map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: "#4caf50",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
      });
      map.setCenter({ lat: tripRoute.currentLat, lng: tripRoute.currentLng });
      map.setZoom(15);
    } else if (hasHistory && tripRoute.locationHistory.length > 0) {
      const lastPoint = tripRoute.locationHistory[tripRoute.locationHistory.length - 1];
      map.setCenter({ lat: lastPoint.lat, lng: lastPoint.lng });
    }

    if (tripRoute.routePolyline) {
      try {
        const path = window.google.maps.geometry.encoding.decodePath(tripRoute.routePolyline);
        routePolylineRef.current = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: "#1a237e",
          strokeOpacity: 0.8,
          strokeWeight: 5,
        });
        routePolylineRef.current.setMap(map);
      } catch (e) {
        console.error("Failed to decode polyline:", e);
      }
    } else if (hasHistory) {
      const path = tripRoute.locationHistory.map(p => ({ lat: p.lat, lng: p.lng }));
      routePolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#1976d2",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      routePolylineRef.current.setMap(map);
    }
  };

  useEffect(() => {
    if (mapsLoaded && activeTab === "map" && document.getElementById("driver-map")) {
      initMap();
      setTimeout(updateMapDisplay, 300);
    }
  }, [mapsLoaded, activeTab]);

  const openNavigation = () => {
    if (!tripRoute?.routeDestination) return;
    const dest = tripRoute.routeDestination;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    window.open(url, "_blank");
  };

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

      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
              activeTab === "queue"
                ? "bg-indigo-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <i className="fa-solid fa-users mr-2"></i>Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trips")}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
              activeTab === "trips"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <i className="fa-solid fa-peso-sign mr-2"></i>My Trips
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
              activeTab === "map"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <i className="fa-solid fa-map mr-2"></i>Map
          </button>
        </div>

        {activeTab === "queue" && (
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
        )}

        {activeTab === "trips" && (
          <div className="bg-white rounded-xl shadow-md p-4">
            <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fa-solid fa-peso-sign text-green-600"></i>My Earnings
            </h5>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
                <small className="opacity-75 block text-xs">Today</small>
                <strong className="text-2xl">₱{tripsSummary.todayEarnings.toFixed(2)}</strong>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
                <small className="opacity-75 block text-xs">This Week</small>
                <strong className="text-2xl">₱{tripsSummary.weekEarnings.toFixed(2)}</strong>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4">
                <small className="opacity-75 block text-xs">Total Trips</small>
                <strong className="text-2xl">{tripsSummary.totalTrips}</strong>
              </div>
            </div>

            <h6 className="font-bold mb-3 text-gray-600">Recent Trips</h6>
            <div className="max-h-96 overflow-y-auto">
              {trips.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No completed trips yet</p>
              ) : (
                <div className="divide-y">
                  {trips.map((trip) => (
                    <div key={trip._id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {trip.routeOrigin || "Terminal"} → {trip.routeDestination || "Unknown"}
                          </div>
                          <small className="text-gray-500">
                            {trip.completedTime ? new Date(trip.completedTime).toLocaleDateString() : ""}
                            {trip.distanceKm && ` · ${trip.distanceKm} km`}
                          </small>
                        </div>
                        <div className="text-right">
                          <strong className="text-green-600 text-lg">₱{trip.calculatedFare?.toFixed(2) || "0.00"}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center">
              <h5 className="font-bold flex items-center gap-2 mb-0">
                <i className="fa-solid fa-map text-blue-600"></i>Live Location
              </h5>
              <div className="flex gap-2">
                {tripRoute?.routeDestination && (
                  <button
                    type="button"
                    onClick={openNavigation}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    <i className="fa-solid fa-location-arrow mr-1"></i>Navigate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMapExpanded(!mapExpanded)}
                  className="border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm transition"
                >
                  <i className={`fa-solid ${mapExpanded ? "fa-compress" : "fa-expand"}`}></i>
                </button>
              </div>
            </div>
            
            {tripRoute && (
              <div className="px-4 py-2 bg-blue-50 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>
                    {tripRoute.active ? (
                      <span className="text-green-600 font-medium">
                        <i className="fa-solid fa-circle text-xs mr-1"></i>On Trip
                      </span>
                    ) : (
                      <span className="text-gray-500">No active trip</span>
                    )}
                  </span>
                  {tripRoute.routeOrigin && tripRoute.routeDestination && (
                    <span>{tripRoute.routeOrigin} → {tripRoute.routeDestination}</span>
                  )}
                  {tripRoute.distanceKm && (
                    <span>{tripRoute.distanceKm} km</span>
                  )}
                </div>
              </div>
            )}
            
            <div 
              id="driver-map" 
              className="w-full"
              style={{ height: mapExpanded ? "calc(100vh - 180px)" : "400px" }}
            >
              {!mapsLoaded && (
                <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-500 p-8">
                  <i className="fa-solid fa-map text-4xl mb-3"></i>
                  {!GMAPS_API_KEY ? (
                    <>
                      <p className="text-center">Google Maps not configured</p>
                      <p className="text-xs text-gray-400">Add VITE_GOOGLE_MAPS_API_KEY to enable</p>
                    </>
                  ) : (
                    <p>Loading map...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DriverPage;