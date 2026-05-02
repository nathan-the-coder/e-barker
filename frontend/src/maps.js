// Google Maps & Traffic Data Integration for E-Barker

let map;
let directionsService;
let directionsRenderer;

// Initialize Google Maps
initMap = function () {
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

// Get traffic data between two points
async function getTrafficData(origin, destination) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${encodeURIComponent(origin)}&` +
        `destination=${encodeURIComponent(destination)}&` +
        `departure_time=now&` +
        `traffic_model=best_guess&` +
        `key=${GOOGLE_MAPS_API_KEY}`,
    );

    const data = await response.json();

    if (data.status === "OK" && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        origin: leg.start_address,
        destination: leg.end_address,
        distance: leg.distance.text,
        duration: leg.duration.text,
        duration_in_traffic: leg.duration_in_traffic?.text || leg.duration.text,
        congestion_level: getCongestionLevel(leg.duration.value, leg.duration_in_traffic?.value),
      };
    }

    return null;
  } catch (error) {
    console.error("Traffic API error:", error);
    return null;
  }
}

// Determine congestion level
function getCongestionLevel(normalDuration, trafficDuration) {
  if (!trafficDuration) return "unknown";
  const ratio = trafficDuration / normalDuration;
  if (ratio <= 1.1) return "light";
  if (ratio <= 1.3) return "moderate";
  return "heavy";
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
