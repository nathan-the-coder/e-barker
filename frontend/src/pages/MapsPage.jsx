import Swal from "sweetalert2";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fareAPI, queueAPI } from "../utils/api";

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

function MapsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const trafficLayerRef = useRef(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [trafficOn, setTrafficOn] = useState(true);
  const [useBackendRoute, setUseBackendRoute] = useState(true);
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [viewMode, setViewMode] = useState("planner");

  useEffect(() => {
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }
    if (!GMAPS_API_KEY) {
      console.warn("Google Maps API key not configured");
      setMapsLoaded(false);
      return;
    }

    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.onload = () => setMapsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Google Maps SDK");
      setMapsLoaded(false);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 17.9483, lng: 121.7886 },
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      disableDefaultUI: false,
      zoomControl: true,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    });

    mapInstanceRef.current = map;

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#1a237e", strokeWeight: 5, strokeOpacity: 0.8 },
    });
    directionsRendererRef.current.setMap(map);

    trafficLayerRef.current = new window.google.maps.TrafficLayer();
    
    if (trafficOn) {
      trafficLayerRef.current.setMap(map);
    }

    console.log("Map initialized successfully");
  }, [mapsLoaded]);

  const toggleTraffic = useCallback(() => {
    const newState = !trafficOn;
    setTrafficOn(newState);
    
    if (trafficLayerRef.current && mapInstanceRef.current) {
      trafficLayerRef.current.setMap(newState ? mapInstanceRef.current : null);
    }
  }, [trafficOn]);

  const loadActiveTrips = useCallback(async () => {
    try {
      const data = await queueAPI.getTracking();
      setActiveTrips(data.vehicles || []);
    } catch (err) {
      console.error("Failed to load active trips:", err);
    }
  }, []);

  const trackDriver = useCallback((trip) => {
    setSelectedTrip(trip);
    
    if (!mapInstanceRef.current || !mapsLoaded) return;

    clearRoute();

    if (trip.routePolyline) {
      try {
        const path = window.google.maps.geometry.encoding.decodePath(trip.routePolyline);
        const routeLine = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: "#1a237e",
          strokeOpacity: 0.8,
          strokeWeight: 5,
        });
        routeLine.setMap(mapInstanceRef.current);
        polylineRef.current = routeLine;
      } catch (err) {
        console.error("Failed to decode polyline:", err);
      }
    }

    if (trip.currentLat && trip.currentLng) {
      const driverMarker = new window.google.maps.Marker({
        position: { lat: trip.currentLat, lng: trip.currentLng },
        map: mapInstanceRef.current,
        title: `Driver: ${trip.driverId?.name || 'Unknown'}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#4caf50",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        animation: window.google.maps.Animation.DROP,
      });
      driverMarkerRef.current = driverMarker;

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding:8px;max-width:200px;">
            <strong>${trip.driverId?.name || 'Driver'}</strong><br/>
            <small>Body #${trip.vehicleId?.bodyNumber || 'N/A'}</small><br/>
            <small class="text-muted">${trip.status}</small><br/>
            <small>Updated: ${trip.lastLocationUpdate ? new Date(trip.lastLocationUpdate).toLocaleTimeString() : 'N/A'}</small>
          </div>
        `,
      });
      infoWindow.open(mapInstanceRef.current, driverMarker);

      mapInstanceRef.current.setCenter({ lat: trip.currentLat, lng: trip.currentLng });
      mapInstanceRef.current.setZoom(15);
    }
  }, [mapsLoaded]);

  const driverMarkerRef = useRef(null);

  useEffect(() => {
    if (viewMode === "tracker") {
      loadActiveTrips();
      const iv = setInterval(loadActiveTrips, 10000);
      return () => clearInterval(iv);
    }
  }, [viewMode, loadActiveTrips]);

  const getBackendRoute = useCallback(async () => {
    if (!origin || !destination) {
      Swal.fire({
        title: "Missing fields",
        text: "Enter both origin and destination.",
        icon: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const data = await fareAPI.getRoute(origin, destination, passengers);
      setRouteResult(data);

      if (mapsLoaded && mapInstanceRef.current && data.route?.polyline) {
        const encoded = data.route.polyline;
        const path = window.google.maps.geometry.encoding.decodePath(encoded);

        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections({ routes: [] });
        }

        const routePath = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: "#1a237e",
          strokeOpacity: 0.8,
          strokeWeight: 5,
        });
        routePath.setMap(mapInstanceRef.current);

        const bounds = new window.google.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        mapInstanceRef.current.fitBounds(bounds);

        polylineRef.current = routePath;
      }
    } catch (err) {
      console.error("Route error:", err);
      Swal.fire({ title: "Error", text: err.message || "Could not fetch route", icon: "error" });
    } finally {
      setLoading(false);
    }
  }, [origin, destination, passengers, mapsLoaded]);

  const polylineRef = useRef(null);

  const determineCongestion = (delay) => {
    if (delay < 60) return "light";
    if (delay < 300) return "moderate";
    return "heavy";
  };

  const getClientRoute = useCallback(async () => {
    if (!origin || !destination) {
      Swal.fire({
        title: "Missing fields",
        text: "Enter both origin and destination.",
        icon: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const geocode = async (query) => {
        const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query + ", Philippines")}.json?key=${TOMTOM_API_KEY}&limit=1`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.results?.length) throw new Error(`Location not found: ${query}`);
        return json.results[0].position;
      };

      const [startPos, endPos] = await Promise.all([geocode(origin), geocode(destination)]);

      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startPos.lat},${startPos.lon}:${endPos.lat},${endPos.lon}/json?key=${TOMTOM_API_KEY}&traffic=true`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();

      if (!routeData.routes?.length) throw new Error("No route between these points.");

      const route = routeData.routes[0];
      const summary = route.summary;

      const path = route.legs[0].points.map((p) => ({ lat: p.latitude, lng: p.longitude }));

      if (polylineRef.current) polylineRef.current.setMap(null);

      polylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#1a237a",
        strokeOpacity: 0.8,
        strokeWeight: 6,
        map: mapInstanceRef.current,
      });

      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapInstanceRef.current.fitBounds(bounds);

      const totalSeconds = summary.travelTimeInSeconds;
      const delaySeconds = summary.trafficDelayInSeconds;
      const baseSeconds = totalSeconds - delaySeconds;

      console.log(summary);
      setRouteResult({
        route: {
          origin: origin,
          destination: destination,
          distanceKm: (summary.lengthInMeters / 1000).toFixed(2),
          distanceText: `${(summary.lengthInMeters / 1000).toFixed(1)} km`,
          durationText: `${Math.round(baseSeconds / 60)} mins`,
          durationInTrafficText: `${Math.round(totalSeconds / 60)} mins`,
          congestion: determineCongestion(summary.trafficDelayInSeconds),
        },
        fare: null,
      });
    } catch (error) {
      Swal.fire({ title: "Route Error", text: error.message, icon: "error" });
    } finally {
      setLoading(false);
    }
  }, [origin, destination, mapsLoaded]);

  const handleGetRoute = () =>
    GMAPS_API_KEY && useBackendRoute ? getBackendRoute() : getClientRoute();

  const clearRoute = () => {
    setRouteResult(null);
    setSelectedTrip(null);
    
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
      driverMarkerRef.current = null;
    }
    
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const congestionColor = (l) =>
    l === "heavy" ? "#d32f2f" : l === "moderate" ? "#f57c00" : "#388e3c";
  const congestionBg = (l) =>
    l === "heavy" ? "#ffebee" : l === "moderate" ? "#fff3e0" : "#e8f5e9";

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker
            </span>
            <span className="text-white/75 text-sm hidden sm:block">
              {user.role}: {user.name || user.email}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(user.role === "driver" ? "/driver" : "/dashboard")}
                className="px-3 py-1.5 text-sm border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> Back
              </button>
              <button onClick={logout} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition">
                <i className="fa-solid fa-sign-out-alt mr-1"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 py-3">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-xl text-gray-800 mb-0 flex items-center gap-2">
            <i className="fa-solid fa-map text-indigo-900"></i> Maps & Route Planner
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                viewMode === 'planner' ? 'bg-indigo-900 text-white' : 'border-2 border-indigo-900 text-indigo-900 hover:bg-indigo-50'
              }`}
              onClick={() => { setViewMode('planner'); clearRoute(); }}
            >
              <i className="fa-solid fa-location-dot mr-1"></i> Route Planner
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition flex items-center gap-1 ${
                viewMode === 'tracker' ? 'bg-green-600 text-white' : 'border-2 border-green-600 text-green-600 hover:bg-green-50'
              }`}
              onClick={() => { setViewMode('tracker'); setSelectedTrip(null); }}
            >
              <i className="fa-solid fa-truck mr-1"></i> PUV Tracker {activeTrips.length > 0 && <span className="bg-white text-green-600 px-1.5 rounded text-xs">{activeTrips.length}</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-3 gap-4">
          <div className="md:col-span-1 xl:col-span-1">
            {viewMode === 'planner' ? (
              <>
                <div className="bg-white rounded-xl shadow-md p-4 mb-3">
                  <h6 className="font-bold mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-indigo-900"></i> Route Planner
                  </h6>
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Origin</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Baggao Terminal"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Destination</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Tuguegarao City"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Passengers</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      min={1}
                      max={10}
                      value={passengers}
                      onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  {GMAPS_API_KEY && (
                    <div className="mb-3 flex items-center">
                      <input
                        className="w-4 h-4 text-indigo-900"
                        type="checkbox"
                        id="backendRoute"
                        checked={useBackendRoute}
                        onChange={(e) => setUseBackendRoute(e.target.checked)}
                      />
                      <label className="ml-2 text-sm text-gray-600" htmlFor="backendRoute">
                        Include fare calculation
                      </label>
                    </div>
                  )}
                  <button
                    onClick={handleGetRoute}
                    disabled={loading}
                    className="w-full bg-indigo-900 hover:bg-indigo-800 text-white py-2 rounded-lg font-semibold transition"
                    style={{ borderRadius: 8 }}
                  >
                    {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Getting Route…</> : <><i className="fa-solid fa-magnifying-glass mr-2"></i> Get Route & Fare</>}
                  </button>
                  {routeResult && (
                    <button
                      onClick={clearRoute}
                      className="w-full border-2 border-gray-400 text-gray-600 hover:bg-gray-50 py-2 rounded-lg mt-2 transition"
                      style={{ borderRadius: 8 }}
                    >
                      <i className="fa-solid fa-xmark mr-2"></i> Clear Route
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-3 mb-3 flex justify-between items-center">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-traffic-light text-orange-500"></i> Traffic Layer
                  </span>
                  <div className="flex items-center">
                    <input
                      className="w-4 h-4 text-indigo-900"
                      type="checkbox"
                      id="trafficToggle"
                      checked={trafficOn}
                      onChange={toggleTraffic}
                    />
                    <label className="ml-2 text-sm text-gray-600" htmlFor="trafficToggle">
                      {trafficOn ? 'ON' : 'OFF'}
                    </label>
                  </div>
                </div>

                {routeResult && (
                  <>
                    <div className="bg-white rounded-xl shadow-md p-4 mb-3">
                      <h6 className="font-bold mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-ruler text-gray-600"></i> Route Details
                      </h6>
                      <p className="mb-1 text-sm">
                        <strong>From:</strong> {routeResult.route.origin}
                      </p>
                      <p className="mb-1 text-sm">
                        <strong>To:</strong> {routeResult.route.destination}
                      </p>
                      <p className="mb-1 text-sm">
                        <strong>Distance:</strong> {routeResult.route.distanceText} (
                        {routeResult.route.distanceKm} km)
                      </p>
                      <p className="mb-1 text-sm">
                        <strong>Duration:</strong> {routeResult.route.durationText}
                      </p>
                      <p className="mb-1 text-sm">
                        <strong>With Traffic:</strong> {routeResult.route.durationInTrafficText}
                      </p>
                      {routeResult.route.congestion && (
                        <div
                          className="mt-2 p-2 rounded text-sm"
                          style={{
                            background: congestionBg(routeResult.route.congestion),
                            color: congestionColor(routeResult.route.congestion),
                          }}
                        >
                          <i className="fa-solid fa-traffic-light mr-1"></i> <strong>{routeResult.route.congestion.toUpperCase()}</strong> traffic conditions
                        </div>
                      )}
                    </div>

                    {routeResult.fare && (
                      <div
                        className="bg-white rounded-xl p-4"
                        style={{ borderRadius: 14, border: "2px solid #1a237e" }}
                      >
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: "linear-gradient(135deg,#e8eaf6,#fff)" }}
                        >
                          <h6 className="font-bold mb-2 flex items-center gap-2">
                            <i className="fa-solid fa-peso-sign text-green-600"></i> Fare Estimate
                          </h6>
                          <div className="flex justify-between mb-1 text-sm">
                            <small className="text-gray-600">Base fare</small>
                            <strong>₱{routeResult.fare.baseFare.toFixed(2)}</strong>
                          </div>
                          <div className="flex justify-between mb-1 text-sm">
                            <small className="text-gray-600">Distance fare ({routeResult.route.distanceKm} km)</small>
                            <strong>₱{routeResult.fare.distanceFare.toFixed(2)}</strong>
                          </div>
                          <div className="flex justify-between mb-1 text-sm">
                            <small className="text-gray-600">Per passenger</small>
                            <strong>₱{routeResult.fare.farePerPassenger.toFixed(2)}</strong>
                          </div>
                          {passengers > 1 && (
                            <div className="flex justify-between mb-1 text-sm">
                              <small className="text-gray-600">× {passengers} passengers</small>
                              <strong className="text-indigo-900">
                                ₱{routeResult.fare.totalFare.toFixed(2)}
                              </strong>
                            </div>
                          )}
                          <hr className="my-2" />
                          <div className="flex justify-between">
                            <strong>Total Fare</strong>
                            <strong className="text-green-600 text-xl">
                              ₱{routeResult.fare.totalFare.toFixed(2)}
                            </strong>
                          </div>
                          <small className="text-gray-500 block mt-1">
                            {routeResult.fare.breakdown}
                          </small>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-md p-4 mb-3">
                  <h6 className="font-bold mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-truck text-green-600"></i> Active PUVs
                  </h6>
                  {activeTrips.length === 0 ? (
                    <p className="text-gray-500 text-sm mb-0">No active trips</p>
                  ) : (
                    <div className="divide-y">
                      {activeTrips.map((trip) => (
                        <button
                          key={trip._id}
                          type="button"
                          className={`w-full text-left px-3 py-3 rounded-lg transition ${
                            selectedTrip?._id === trip._id ? 'bg-indigo-100 border-l-4 border-indigo-900' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => trackDriver(trip)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium text-sm">{trip.driverId?.name || 'Driver'}</div>
                              <div className="text-gray-500 text-xs">Body #{trip.vehicleId?.bodyNumber}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${trip.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {trip.status}
                            </span>
                          </div>
                          {trip.routeOrigin && trip.routeDestination && (
                            <div className="text-gray-500 text-xs mt-1">
                              {trip.routeOrigin} → {trip.routeDestination}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTrip && (
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <h6 className="font-bold mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-indigo-900"></i> Trip Details
                    </h6>
                    <div className="mb-2">
                      <small className="text-gray-500 block">Driver</small>
                      <strong>{selectedTrip.driverId?.name || 'Unknown'}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-gray-500 block">Vehicle</small>
                      <strong>Body #{selectedTrip.vehicleId?.bodyNumber || 'N/A'}</strong>
                    </div>
                    {selectedTrip.routeOrigin && selectedTrip.routeDestination && (
                      <>
                        <div className="mb-2">
                          <small className="text-gray-500 block">Route</small>
                          <strong>{selectedTrip.routeOrigin}</strong>
                          <br />
                          <small className="text-gray-500">→ {selectedTrip.routeDestination}</small>
                        </div>
                        {selectedTrip.distanceKm && (
                          <div className="mb-2">
                            <small className="text-gray-500 block">Distance</small>
                            <strong>{selectedTrip.distanceKm} km</strong>
                          </div>
                        )}
                      </>
                    )}
                    <div className="mb-2">
                      <small className="text-gray-500 block">Status</small>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedTrip.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selectedTrip.status}
                      </span>
                    </div>
                    {selectedTrip.currentLat && selectedTrip.currentLng && (
                      <div className="mb-2">
                        <small className="text-gray-500 block">Current Location</small>
                        <strong className="block text-xs">
                          {selectedTrip.currentLat.toFixed(5)}, {selectedTrip.currentLng.toFixed(5)}
                        </strong>
                        <small className="text-gray-500">
                          Updated: {selectedTrip.lastLocationUpdate ? new Date(selectedTrip.lastLocationUpdate).toLocaleTimeString() : 'N/A'}
                        </small>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedTrip(null); clearRoute(); }}
                      className="w-full border-2 border-gray-400 text-gray-600 hover:bg-gray-50 py-2 rounded-lg mt-2 transition"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="md:col-span-3 xl:col-span-2">
            <div
              className="bg-white rounded-xl shadow-md overflow-hidden"
              style={{ borderRadius: 14 }}
            >
              {!mapsLoaded && (
                <div
                  className="flex flex-col items-center justify-center"
                  style={{ height: 520, background: "#e8eaf6" }}
                >
                  <i className="fa-solid fa-map text-5xl text-gray-300 mb-3"></i>
                  <h5 className="mt-3 text-gray-600">Google Maps Not Configured</h5>
                  <p className="text-gray-500 text-sm text-center px-4">
                    Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env</code> to
                    enable the live map.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Route & fare data via the <strong>Get Route & Fare</strong> button still
                    works with a backend API key.
                  </p>
                </div>
              )}
              <div ref={mapRef} style={{ height: 520, display: mapsLoaded ? "block" : "none" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapsPage;