import Swal from 'sweetalert2';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fareAPI } from '../utils/api';

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function MapsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const trafficLayerRef = useRef(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [trafficOn, setTrafficOn] = useState(true);
  const [useBackendRoute, setUseBackendRoute] = useState(false);

  // ─── Load Google Maps JS SDK ───────────────────────────────────────────────
  useEffect(() => {
    if (window.google?.maps) { setMapsLoaded(true); return; }
    if (!GMAPS_API_KEY) { setMapsLoaded(false); return; }

    const existing = document.getElementById('gmaps-script');
    if (existing) { existing.onload = () => setMapsLoaded(true); return; }

    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ─── Init map once SDK is ready ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
       center: { lat: 17.9483, lng: 121.7886 }, // Baggao, Cagayan
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#1a237e', strokeWeight: 5, strokeOpacity: 0.8 }
    });
    directionsRendererRef.current.setMap(mapInstanceRef.current);

    trafficLayerRef.current = new window.google.maps.TrafficLayer();
    if (trafficOn) trafficLayerRef.current.setMap(mapInstanceRef.current);
  }, [mapsLoaded]);

  // ─── Toggle traffic layer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!trafficLayerRef.current || !mapInstanceRef.current) return;
    trafficLayerRef.current.setMap(trafficOn ? mapInstanceRef.current : null);
  }, [trafficOn]);

  // ─── Get route via backend (incl. fare calc) ────────────────────────────────
  const getBackendRoute = useCallback(async () => {
    if (!origin || !destination) {
      Swal.fire({ title: 'Missing fields', text: 'Enter both origin and destination.', icon: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const data = await fareAPI.getRoute(origin, destination, passengers);
      setRouteResult(data);

      // Draw on map using DirectionsService if maps loaded
      if (mapsLoaded && mapInstanceRef.current) {
        const svc = new window.google.maps.DirectionsService();
        svc.route({
          origin, destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: { departureTime: new Date(), trafficModel: 'bestGuess' }
        }, (result, status) => {
          if (status === 'OK') {
            directionsRendererRef.current.setDirections(result);
          }
        });
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message || 'Could not fetch route', icon: 'error' });
    } finally {
      setLoading(false);
    }
  }, [origin, destination, passengers, mapsLoaded]);

  // ─── Get route purely via Maps JS API (client-side) ────────────────────────
  const getClientRoute = useCallback(() => {
    if (!origin || !destination) {
      Swal.fire({ title: 'Missing fields', text: 'Enter both origin and destination.', icon: 'warning' });
      return;
    }
    if (!mapsLoaded) {
      Swal.fire({ title: 'Maps not loaded', text: 'Google Maps API key required.', icon: 'warning' });
      return;
    }
    setLoading(true);
    const svc = new window.google.maps.DirectionsService();
    svc.route({
      origin, destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: { departureTime: new Date(), trafficModel: 'bestGuess' }
    }, (result, status) => {
      setLoading(false);
      if (status === 'OK') {
        directionsRendererRef.current.setDirections(result);
        const leg = result.routes[0].legs[0];
        const distKm = leg.distance.value / 1000;
        const durMin = Math.ceil((leg.duration_in_traffic?.value || leg.duration.value) / 60);
        setRouteResult({
          route: {
            origin: leg.start_address,
            destination: leg.end_address,
            distanceKm: parseFloat(distKm.toFixed(2)),
            distanceText: leg.distance.text,
            durationText: leg.duration.text,
            durationInTrafficText: leg.duration_in_traffic?.text || leg.duration.text,
            durationMinutes: durMin,
            congestion: null
          },
          fare: null // no server-side fare without API key on backend
        });
      } else {
        Swal.fire({ title: 'Route Error', text: `Could not get directions: ${status}`, icon: 'error' });
      }
    });
  }, [origin, destination, mapsLoaded]);

  const handleGetRoute = () => (GMAPS_API_KEY && useBackendRoute) ? getBackendRoute() : getClientRoute();

  const clearRoute = () => {
    setRouteResult(null);
    if (directionsRendererRef.current) directionsRendererRef.current.setDirections({ routes: [] });
  };

  if (!user) { navigate('/login'); return null; }

  const congestionColor = (l) => l === 'heavy' ? '#d32f2f' : l === 'moderate' ? '#f57c00' : '#388e3c';
  const congestionBg   = (l) => l === 'heavy' ? '#ffebee' : l === 'moderate' ? '#fff3e0' : '#e8f5e9';

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      {/* Navbar */}
      <nav className="navbar navbar-dark" style={{ background: 'linear-gradient(135deg,#1a237e,#283593)' }}>
        <div className="container">
          <span className="navbar-brand fw-bold">🚐 E-Barker</span>
          <span className="text-white opacity-75 small">{user.role}: {user.name || user.email}</span>
          <div className="d-flex gap-2">
            <button onClick={() => navigate(user.role === 'driver' ? '/driver' : '/dashboard')}
              className="btn btn-sm btn-outline-light">← Back</button>
            <button onClick={logout} className="btn btn-sm btn-danger">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container-fluid py-3 px-4">
        <h4 className="fw-bold mb-3">🗺 Maps &amp; Route Planner</h4>

        <div className="row g-3">
          {/* ── Sidebar ── */}
          <div className="col-12 col-md-4 col-xl-3">

            {/* Route form */}
            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
              <div className="card-body">
                <h6 className="fw-bold mb-3">📍 Route Planner</h6>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Origin</label>
                   <input type="text" className="form-control form-control-sm" value={origin}
                     onChange={e => setOrigin(e.target.value)} placeholder="e.g. Baggao Terminal" />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Destination</label>
                   <input type="text" className="form-control form-control-sm" value={destination}
                     onChange={e => setDestination(e.target.value)} placeholder="e.g. Tuguegarao City" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Passengers</label>
                  <input type="number" className="form-control form-control-sm" min={1} max={10}
                    value={passengers} onChange={e => setPassengers(parseInt(e.target.value) || 1)} />
                </div>
                {GMAPS_API_KEY && (
                  <div className="form-check mb-3">
                    <input className="form-check-input" type="checkbox" id="backendRoute"
                      checked={useBackendRoute} onChange={e => setUseBackendRoute(e.target.checked)} />
                    <label className="form-check-label small" htmlFor="backendRoute">
                      Include fare calculation
                    </label>
                  </div>
                )}
                <button onClick={handleGetRoute} disabled={loading}
                  className="btn btn-primary w-100 fw-semibold" style={{ borderRadius: 8 }}>
                  {loading ? '⏳ Getting Route…' : '🔍 Get Route & Fare'}
                </button>
                {routeResult && (
                  <button onClick={clearRoute} className="btn btn-outline-secondary w-100 mt-2" style={{ borderRadius: 8 }}>
                    ✕ Clear Route
                  </button>
                )}
              </div>
            </div>

            {/* Traffic toggle */}
            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
              <div className="card-body py-2 d-flex justify-content-between align-items-center">
                <span className="small fw-semibold">🚦 Traffic Layer</span>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" id="trafficToggle"
                    checked={trafficOn} onChange={e => setTrafficOn(e.target.checked)} />
                </div>
              </div>
            </div>

            {/* Route result */}
            {routeResult && (
              <>
                <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
                  <div className="card-body">
                    <h6 className="fw-bold mb-2">📏 Route Details</h6>
                    <p className="mb-1 small"><strong>From:</strong> {routeResult.route.origin}</p>
                    <p className="mb-1 small"><strong>To:</strong> {routeResult.route.destination}</p>
                    <p className="mb-1 small"><strong>Distance:</strong> {routeResult.route.distanceText} ({routeResult.route.distanceKm} km)</p>
                    <p className="mb-1 small"><strong>Duration:</strong> {routeResult.route.durationText}</p>
                    <p className="mb-1 small"><strong>With Traffic:</strong> {routeResult.route.durationInTrafficText}</p>
                    {routeResult.route.congestion && (
                      <div className="mt-2 p-2 rounded small"
                        style={{ background: congestionBg(routeResult.route.congestion), color: congestionColor(routeResult.route.congestion) }}>
                        🚦 <strong>{routeResult.route.congestion.toUpperCase()}</strong> traffic conditions
                      </div>
                    )}
                  </div>
                </div>

                {routeResult.fare && (
                  <div className="card border-0 shadow-sm" style={{ borderRadius: 14, border: '2px solid #1a237e' }}>
                    <div className="card-body" style={{ background: 'linear-gradient(135deg,#e8eaf6,#fff)' }}>
                      <h6 className="fw-bold mb-2">💰 Fare Estimate</h6>
                      <div className="d-flex justify-content-between mb-1">
                        <small>Base fare</small>
                        <strong>₱{routeResult.fare.baseFare.toFixed(2)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <small>Distance fare ({routeResult.route.distanceKm} km)</small>
                        <strong>₱{routeResult.fare.distanceFare.toFixed(2)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <small>Per passenger</small>
                        <strong>₱{routeResult.fare.farePerPassenger.toFixed(2)}</strong>
                      </div>
                      {passengers > 1 && (
                        <div className="d-flex justify-content-between mb-1">
                          <small>× {passengers} passengers</small>
                          <strong className="text-primary">₱{routeResult.fare.totalFare.toFixed(2)}</strong>
                        </div>
                      )}
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between">
                        <strong>Total Fare</strong>
                        <strong className="text-success fs-5">₱{routeResult.fare.totalFare.toFixed(2)}</strong>
                      </div>
                      <small className="text-muted d-block mt-1">{routeResult.fare.breakdown}</small>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Map ── */}
          <div className="col-12 col-md-8 col-xl-9">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
              {!mapsLoaded && (
                <div className="d-flex flex-column justify-content-center align-items-center"
                  style={{ height: 520, background: '#e8eaf6' }}>
                  <div style={{ fontSize: 48 }}>🗺</div>
                  <h5 className="mt-3 text-muted">Google Maps Not Configured</h5>
                  <p className="text-muted small text-center px-4">
                    Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env</code> to enable the live map.
                  </p>
                  <p className="text-muted small">Route &amp; fare data via the <strong>Get Route &amp; Fare</strong> button still works with a backend API key.</p>
                </div>
              )}
              <div ref={mapRef} style={{ height: 520, display: mapsLoaded ? 'block' : 'none' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapsPage;
