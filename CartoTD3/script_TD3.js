// Variables globales
        let scene, camera, renderer, globe, markers = [];
        let map, leafletMarkers = [];
        let countries = [];
        let userPosition = null;

        // Conversion Lat/Lon vers coordonnées cartésiennes
        function latLonToCartesian(lat, lon, radius) {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            
            const x = -(radius * Math.sin(phi) * Math.cos(theta));
            const z = (radius * Math.sin(phi) * Math.sin(theta));
            const y = (radius * Math.cos(phi));
            
            return { x, y, z };
        }

        // Initialisation de la scène Three.js
        function initThreeJS() {
            const container = document.getElementById('canvas-container');
            
            // Scène
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000510);
            
            // Caméra
            camera = new THREE.PerspectiveCamera(
                75,
                container.clientWidth / container.clientHeight,
                0.1,
                1000
            );
            camera.position.z = 3;
            
            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);
            
            // Lumières
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 3, 5);
            scene.add(directionalLight);
            
            // Création du globe
            const geometry = new THREE.SphereGeometry(1, 64, 64);
            
            // Texture de la Terre
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                'https://unpkg.com/three-globe@2.24.10/example/img/earth-blue-marble.jpg',
                (texture) => {
                    const material = new THREE.MeshPhongMaterial({
                        map: texture,
                        shininess: 10
                    });
                    globe = new THREE.Mesh(geometry, material);
                    scene.add(globe);
                    document.getElementById('loading').style.display = 'none';
                },
                undefined,
                (error) => {
                    console.error('Erreur de chargement de texture:', error);
                    // Fallback: matériau bleu simple
                    const material = new THREE.MeshPhongMaterial({
                        color: 0x2233ff,
                        shininess: 10
                    });
                    globe = new THREE.Mesh(geometry, material);
                    scene.add(globe);
                    document.getElementById('loading').style.display = 'none';
                }
            );
            
            // Gestion du redimensionnement
            window.addEventListener('resize', onWindowResize);
            
            // Raycaster pour les clics
            setupRaycaster();
            
            // Contrôle de la souris
            setupMouseControls();
            
            // Animation
            animate();
        }

        // Variables pour le contrôle de la souris
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        // Animation
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }

        // Contrôle de la rotation avec la souris
        function setupMouseControls() {
            const canvas = renderer.domElement;
            
            canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (isDragging && globe) {
                    const deltaX = e.clientX - previousMousePosition.x;
                    const deltaY = e.clientY - previousMousePosition.y;
                    
                    globe.rotation.y += deltaX * 0.005;
                    globe.rotation.x += deltaY * 0.005;
                    
                    // Limiter la rotation verticale
                    globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
                    
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                }
            });
            
            canvas.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            canvas.addEventListener('mouseleave', () => {
                isDragging = false;
            });
            
            // Support tactile pour mobile
            canvas.addEventListener('touchstart', (e) => {
                isDragging = true;
                const touch = e.touches[0];
                previousMousePosition = { x: touch.clientX, y: touch.clientY };
            });
            
            canvas.addEventListener('touchmove', (e) => {
                if (isDragging && globe) {
                    const touch = e.touches[0];
                    const deltaX = touch.clientX - previousMousePosition.x;
                    const deltaY = touch.clientY - previousMousePosition.y;
                    
                    globe.rotation.y += deltaX * 0.005;
                    globe.rotation.x += deltaY * 0.005;
                    
                    globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
                    
                    previousMousePosition = { x: touch.clientX, y: touch.clientY };
                }
            });
            
            canvas.addEventListener('touchend', () => {
                isDragging = false;
            });
        }

        // Redimensionnement
        function onWindowResize() {
            const container = document.getElementById('canvas-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        // Raycaster pour la détection de clics
        function setupRaycaster() {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            
            renderer.domElement.addEventListener('click', (event) => {
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                
                raycaster.setFromCamera(mouse, camera);
                
                const intersects = raycaster.intersectObjects(markers);
                
                if (intersects.length > 0) {
                    const marker = intersects[0].object;
                    if (marker.userData.country) {
                        selectCountry(marker.userData.country);
                    }
                }
            });
        }

        // Ajout d'un marqueur 3D
        function addMarker(lat, lon, color, countryData) {
			const pos = latLonToCartesian(lat, lon, 1.02);

			// Si le pays a un drapeau, on l’utilise comme texture
			if (countryData.flags && countryData.flags.png) {
				const textureLoader = new THREE.TextureLoader();
				textureLoader.load(countryData.flags.png, (texture) => {
					const flagGeometry = new THREE.PlaneGeometry(0.08, 0.05);
					const flagMaterial = new THREE.MeshBasicMaterial({
						map: texture,
						transparent: true,
						side: THREE.DoubleSide
					});

					const flag = new THREE.Mesh(flagGeometry, flagMaterial);
					flag.position.set(pos.x, pos.y, pos.z);

					// Oriente le drapeau vers l’extérieur du globe
					flag.lookAt(new THREE.Vector3(0, 0, 0));
					flag.userData.country = countryData;

					globe.add(flag); // ✅ le drapeau suit le globe
					markers.push(flag);
				});
			} else {
				// fallback : petit point rouge si pas de drapeau
				const geometry = new THREE.SphereGeometry(0.02, 16, 16);
				const material = new THREE.MeshBasicMaterial({ color: color });
				const marker = new THREE.Mesh(geometry, material);
				marker.position.set(pos.x, pos.y, pos.z);
				marker.userData.country = countryData;
				globe.add(marker); // ✅ le point suit le globe
				markers.push(marker);
			}
		}


        // Initialisation de Leaflet
        function initLeaflet() {
            map = L.map('map').setView([48.8566, 2.3522], 3);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Gestion des clics sur la carte
            map.on('click', (e) => {
                rotateGlobeToPosition(e.latlng.lat, e.latlng.lng);
            });
        }

        // Rotation du globe vers une position
        function rotateGlobeToPosition(lat, lon) {
            if (!globe) return;
            
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            
            globe.rotation.y = -theta+1.5;
            globe.rotation.x = -(phi - Math.PI / 2);
            
            document.getElementById('position').textContent = 
                `Position: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
        }

        // Sélection d'un pays
        function selectCountry(country) {
            const lat = country.latlng[0];
            const lon = country.latlng[1];
            
            // Centrer la carte
            map.setView([lat, lon], 5);
            
            // Mettre à jour l'info
            document.getElementById('selected').textContent = 
                `Pays sélectionné: ${country.name.common}`;
        }

        // Chargement des pays depuis l'API
        async function loadCountries() {
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags');
                countries = await response.json();
                
                // Sélectionner quelques pays importants pour ne pas surcharger
                const selectedCountries = countries.filter(country => 
                    country.population > 50000000 || 
                    ['France', 'USA', 'China', 'Japan', 'Brazil', 'Australia', 
                     'Germany', 'UK', 'India', 'Canada', 'Russia', 'Italy', 
                     'Spain', 'Mexico'].includes(country.name.common)
                );
                
                // Ajouter les marqueurs
                countries.forEach(country => {
                    if (country.latlng && country.latlng.length === 2) {
                        const [lat, lon] = country.latlng;
                        
                        // Marqueur 3D
                        addMarker(lat, lon, 0xff0000, country);
                        
                        // Marqueur Leaflet
                        const leafletMarker = L.marker([lat, lon])
                            .addTo(map)
                            .bindPopup(`
										<div style="text-align:center;">
										  <b>${country.name.common}</b><br>
										  <img src="${country.flags.png}" alt="${country.flags.alt}" width="50" style="border:1px solid #ccc; border-radius:4px;"><br>
										  Pop: ${(country.population / 1_000_000).toFixed(1)} M
										</div>
									  `);
                        
                        leafletMarker.on('click', () => {
                            rotateGlobeToPosition(lat, lon);
                        });
                        
                        leafletMarkers.push(leafletMarker);
                    }
                });
                
            } catch (error) {
                console.error('Erreur de chargement des pays:', error);
            }
        }

        // Géolocalisation de l'utilisateur
        function getUserLocation() {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        userPosition = { lat, lon };
                        
                        // Marqueur bleu pour l'utilisateur
                        addMarker(lat, lon, 0x0000ff, { 
                            name: { common: 'Votre position' }, 
                            latlng: [lat, lon] 
                        });
                        
                        // Marqueur Leaflet
                        const userMarker = L.marker([lat, lon], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(map).bindPopup('Vous êtes ici!');
                        
                        // Centrer sur la position
                        map.setView([lat, lon], 6);
                        rotateGlobeToPosition(lat, lon);
                        
                        document.getElementById('position').textContent = 
                            `Votre position: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
                    },
                    (error) => {
                        console.error('Erreur de géolocalisation:', error);
                        document.getElementById('position').textContent = 
                            'Géolocalisation non disponible';
                    }
                );
            }
        }

        // Initialisation
        window.addEventListener('load', () => {
            initThreeJS();
            initLeaflet();
            loadCountries();
            getUserLocation();
        });