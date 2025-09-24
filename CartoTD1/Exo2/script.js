let map;
let watchId;
let userMarker;
let precisionCircle;
let currentTileLayer;
let currentPosition = null;

// Positions fixes
const nicePos = [43.7102, 7.2620]; // Nice centre-ville
const marseillePos = [43.2965, 5.3698]; // Marseille
const bermudaTriangle = [
  [32.321, -64.757], // Bermudes
  [18.5000, -66.5000], // Puerto Rico
  [25.5000, -80.5000]  // Miami
];

// Initialisation de la carte
function initMap() {
  map = L.map('map').setView([43.7102, 7.2620], 10);
  
  currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

// getCurrentPosition
function getCurrentPos() {
  const status = document.getElementById('current-status');
  status.style.display = 'block';
  status.className = 'status';
  status.textContent = 'Localisation en cours...';

  if (!navigator.geolocation) {
	status.className = 'status error';
	status.textContent = 'Géolocalisation non supportée';
	return;
  }

  navigator.geolocation.getCurrentPosition(
	(position) => {
	  displayPosition(position, 'current');
	  status.className = 'status success';
	  status.textContent = 'Position obtenue avec succès';
	  
	  // Centrer la carte sur la position
	  const lat = position.coords.latitude;
	  const lon = position.coords.longitude;
	  map.setView([lat, lon], 13);
	  
	  // Ajouter marqueur utilisateur
	  if (userMarker) {
		map.removeLayer(userMarker);
	  }
	  userMarker = L.marker([lat, lon])
		.addTo(map)
		.bindPopup('Votre position actuelle')
		.openPopup();
	  
	  // Ajouter cercle de précision
	  addPrecisionCircle(lat, lon, position.coords.accuracy);
	  
	  currentPosition = position;
	},
	(error) => {
	  status.className = 'status error';
	  status.textContent = `Erreur: ${getErrorMessage(error)}`;
	},
	{
	  enableHighAccuracy: true,
	  timeout: 10000,
	  maximumAge: 60000
	}
  );
}

// Affichage des données de position
function displayPosition(position, prefix) {
  const coords = position.coords;
  const timestamp = new Date(position.timestamp);
  
  document.getElementById(`${prefix}-lat`).textContent = 
	coords.latitude ? coords.latitude.toFixed(6) : 'N/A';
  document.getElementById(`${prefix}-lon`).textContent = 
	coords.longitude ? coords.longitude.toFixed(6) : 'N/A';
  document.getElementById(`${prefix}-alt`).textContent = 
	coords.altitude ? `${coords.altitude.toFixed(1)} m` : 'N/A';
  document.getElementById(`${prefix}-acc`).textContent = 
	coords.accuracy ? `${coords.accuracy.toFixed(1)} m` : 'N/A';
  document.getElementById(`${prefix}-speed`).textContent = 
	coords.speed ? `${(coords.speed * 3.6).toFixed(1)} km/h` : 'N/A';
  document.getElementById(`${prefix}-date`).textContent = 
	timestamp.toLocaleString('fr-FR');
}

// Ajouter cercle de précision
function addPrecisionCircle(lat, lon, accuracy) {
  if (precisionCircle) {
	map.removeLayer(precisionCircle);
  }
  
  precisionCircle = L.circle([lat, lon], {
	color: '#06b6d4',
	fillColor: '#06b6d4',
	fillOpacity: 0.1,
	radius: accuracy
  }).addTo(map);
}

// Fonctions de la carte
function addNiceMarker() {
  L.marker(nicePos)
	.addTo(map)
	.bindPopup('Nice - Centre Ville')
	.openPopup();
  
  showMapStatus('Marqueur Nice ajouté');
}

function drawBermudaTriangle() {
  L.polygon(bermudaTriangle, {
	color: 'red',
	fillColor: 'red',
	fillOpacity: 0.2
  }).addTo(map).bindPopup('Triangle des Bermudes');
  
  showMapStatus('Triangle des Bermudes tracé');
}

let tileIndex = 0;
const tileLayers = [
  {
	name: 'OpenStreetMap',
	url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	attribution: '© OpenStreetMap contributors'
  },
  {
	name: 'Stamen Terrain',
	url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
	attribution: 'Map tiles by Stamen Design, CC BY 3.0'
  },
  {
	name: 'CartoDB Dark',
	url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
	attribution: '© CartoDB'
  }
];

function changeMapTiles() {
  tileIndex = (tileIndex + 1) % tileLayers.length;
  const layer = tileLayers[tileIndex];
  
  if (currentTileLayer) {
	map.removeLayer(currentTileLayer);
  }
  
  currentTileLayer = L.tileLayer(layer.url, {
	attribution: layer.attribution
  }).addTo(map);
  
  showMapStatus(`Carte changée: ${layer.name}`);
}

// Calculer la distance avec la formule de Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function showDistanceToMarseille() {
  if (!currentPosition) {
	showMapStatus('Veuillez d\'abord obtenir votre position', 'error');
	return;
  }
  
  const userLat = currentPosition.coords.latitude;
  const userLon = currentPosition.coords.longitude;
  
  // Marqueur Marseille
  L.marker(marseillePos)
	.addTo(map)
	.bindPopup('Marseille');
  
  // Ligne vers Marseille
  L.polyline([[userLat, userLon], marseillePos], {
	color: '#7c3aed',
	weight: 3
  }).addTo(map);
  
  // Calculer la distance
  const distance = calculateDistance(userLat, userLon, marseillePos[0], marseillePos[1]);
  
  const distanceInfo = document.getElementById('distance-info');
  distanceInfo.innerHTML = `
	<div class="info-item">
	  <span class="label">Distance vers Marseille:</span>
	  <span class="value">${distance.toFixed(2)} km</span>
	</div>
  `;
  
  showMapStatus(`Distance calculée: ${distance.toFixed(2)} km`);
}

async function loadGeoJSON() {
  try {
	// Exemple avec les données de départements français
	const response = await fetch('https://geo.api.gouv.fr/departements?fields=nom,code,centre&format=geojson&zone=metro');
	const geojsonData = await response.json();
	
	L.geoJSON(geojsonData, {
	  style: {
		color: '#06b6d4',
		weight: 2,
		fillOpacity: 0.1
	  },
	  onEachFeature: function(feature, layer) {
		if (feature.properties && feature.properties.nom) {
		  layer.bindPopup(`Département: ${feature.properties.nom} (${feature.properties.code})`);
		}
	  }
	}).addTo(map);
	
	showMapStatus('Données GeoJSON chargées (départements français)');
  } catch (error) {
	showMapStatus('Erreur lors du chargement GeoJSON', 'error');
  }
}

async function showRoute() {
  if (!currentPosition) {
	showMapStatus('Veuillez d\'abord obtenir votre position', 'error');
	return;
  }
  
  const userLat = currentPosition.coords.latitude;
  const userLon = currentPosition.coords.longitude;
  
  try {
	// Utiliser l'API OSRM pour calculer un itinéraire vers Nice
	const response = await fetch(
	  `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${nicePos[1]},${nicePos[0]}?overview=full&geometries=geojson`
	);
	
	const data = await response.json();
	
	if (data.routes && data.routes.length > 0) {
	  const route = data.routes[0];
	  const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
	  
	  L.polyline(coordinates, {
		color: '#10b981',
		weight: 4
	  }).addTo(map).bindPopup(`Itinéraire: ${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`);
	  
	  showMapStatus(`Itinéraire calculé: ${(route.distance / 1000).toFixed(1)} km`);
	}
  } catch (error) {
	showMapStatus('Erreur lors du calcul d\'itinéraire', 'error');
  }
}

function showMapStatus(message, type = 'success') {
  const status = document.getElementById('map-status');
  status.style.display = 'block';
  status.className = `status ${type}`;
  status.textContent = message;
  
  setTimeout(() => {
	status.style.display = 'none';
  }, 3000);
}

function getErrorMessage(error) {
  switch(error.code) {
	case error.PERMISSION_DENIED:
	  return "Permission refusée";
	case error.POSITION_UNAVAILABLE:
	  return "Position indisponible";
	case error.TIMEOUT:
	  return "Délai dépassé";
	default:
	  return "Erreur inconnue";
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  initMap();
});