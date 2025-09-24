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
  [25.0000, -71.0000], // Bermudes
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

// watchPosition
function startWatching() {
  const status = document.getElementById('watch-status');
  const watchBtn = document.getElementById('watch-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  status.style.display = 'block';
  status.className = 'status';
  status.textContent = 'Surveillance en cours...';
  
  watchBtn.disabled = true;
  stopBtn.disabled = false;

  watchId = navigator.geolocation.watchPosition(
	(position) => {
	  displayPosition(position, 'watch');
	  status.className = 'status success';
	  status.textContent = 'Position mise à jour';
	  
	  // Mettre à jour le marqueur
	  const lat = position.coords.latitude;
	  const lon = position.coords.longitude;
	  
	  if (userMarker) {
		userMarker.setLatLng([lat, lon]);
	  } else {
		userMarker = L.marker([lat, lon]).addTo(map);
	  }
	  
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
	  maximumAge: 30000
	}
  );
}

function stopWatching() {
  if (watchId) {
	navigator.geolocation.clearWatch(watchId);
	watchId = null;
  }
  
  const status = document.getElementById('watch-status');
  const watchBtn = document.getElementById('watch-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  status.className = 'status';
  status.textContent = 'Surveillance arrêtée';
  
  watchBtn.disabled = false;
  stopBtn.disabled = true;
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

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  initMap();
});