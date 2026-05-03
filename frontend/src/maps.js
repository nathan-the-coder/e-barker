// Google Maps & Traffic Data Integration for E-Barker
let map;
let directionsService;
let directionsRenderer;

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

// Initialize Google Maps
const initMap = function () {
  const terminalLocation = { lat: 17.9483, lng: 121.7886 }; // Baggao, Cagayan

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: terminalLocation,
    mapTypeId: "roadmap",
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  // Add terminal marker
  new google.maps.Marker({
    position: terminalLocation,
    map: map,
    title: "E-Barker Baggao Terminal",
    icon: {
      url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    },
  });
};

/**
 * Fetches real-time traffic for Cagayan Valley using Tomtom.
 */
async function getTrafficData(origin, destination) {
  // Internal helper to turn address strings into coordinates
  const getCoords = async (query) => {
    // To stay local, add "Philippines" to the query.
    const geoUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query + ", Philippines")}.json?key=${TOMTOM_API_KEY}&limit=1`;
    const res = await fetch(geoUrl);
    const data = await res.json();
    if (!data.results?.length) throw new Error(`Location not found: ${query}`);
    return `${data.results[0].position.lat},${data.results[0].position.lon}`;
  };

  try {
    // Convert addresses
    const [start, end] = await Promise.all([getCoords(origin), getCoords(destination)]);

    // Calculate Route with Real-Time traffic
    const routeUrl =
      `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?` +
      new URLSearchParams({
        key: TOMTOM_API_KEY,
        traffic: true,
        routeType: "fastest",
      });

    const response = await fetch(routeUrl);
    if (!response.ok) throw new Error("Tomtom Routing API Error");

    const { routes } = await response.json();
    const { summary } = routes[0];

    // Format the data to match original structure.
    const travelTimeMins = Math.round(summary.travelTimeInSeconds / 60);
    const delayMins = Math.round(summary.trafficDelaysInSeconds / 60);

    return {
      origin: origin,
      destination: destination,
      distance: `${(summary.lengthInMeters / 1000).toFixed(1)} km`,
      duration: `${Math.round(summary.noTrafficTravelTimeInSeconds / 60)} mins`,
      duration_in_traffic: `${travelTimeMins} mins`,
      traffic_delay: `${delayMins} mins`,
      // Custom congestion logic for provincial roads.
      congestion_level: determineCongestion(summary.trafficDelaysInSeconds),
    };
  } catch (error) {
    console.error("Traffic Data Error: ", error.message);
    return null;
  }
}

// Modern helper for congestion status
function determineCongestion(delaySeconds) {
  if (delaySeconds < 60) return "Fluid";
  if (delaySeconds < 300) return "Moderate"; // 1-5 mins delay
  return "Heavy";
}

// Display route on map
function displayRoute(origin, destination) {
  if (!directionsService || !directionsRenderer) return;

  directionsService.route(
    {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: "bestguess",
      },
    },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      } else {
        console.error("Directions request failed:", status);
      }
    },
  );
}

// Update traffic info display
async function updateTrafficInfo(origin, destination) {
  const trafficData = await getTrafficData(origin, destination);

  if (trafficData) {
    const infoDiv = document.getElementById("traffic-info");
    if (infoDiv) {
      infoDiv.innerHTML = `
        <div class="alert alert-${getCongestionColor(trafficData.congestion_level)}">
          <h6>Traffic Info: ${origin} → ${destination}</h6>
          <p class="mb-1"><strong>Distance:</strong> ${trafficData.distance}</p>
          <p class="mb-1"><strong>Normal Duration:</strong> ${trafficData.duration}</p>
          <p class="mb-1"><strong>With Traffic:</strong> ${trafficData.duration_in_traffic}</p>
          <p class="mb-0"><strong>Congestion:</strong> ${trafficData.congestion_level.toUpperCase()}</p>
        </div>
      `;
    }
  }
}

function getCongestionColor(level) {
  switch (level) {
    case "light":
      return "success";
    case "moderate":
      return "warning";
    case "heavy":
      return "danger";
    default:
      return "secondary";
  }
}

window.initMap = initMap;
// Export for use in other modules
export { initMap, getTrafficData, displayRoute, updateTrafficInfo };
