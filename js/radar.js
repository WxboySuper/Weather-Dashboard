/**
 * Radar functionality for the Severe Weather Monitoring Dashboard
 */

const RadarManager = {
    map: null,
    radarLayer: null,
    watchLayers: {},
    radarRefreshInterval: null,
    currentProduct: 'reflectivity',
    currentMapStyle: 'streets',

    /**
     * Initialize the radar map
     */
    init: function() {
        // Initialize the Leaflet map
        this.map = L.map('radar-map', {
            center: CONFIG.MAP.center,
            zoom: CONFIG.MAP.zoom,
            zoomControl: false
        });

        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Add map style selector to the radar controls
        const radarControls = document.querySelector('.radar-controls');

        // Add map style selector
        const mapStyleSelector = document.createElement('select');
        mapStyleSelector.id = 'map-style';
        mapStyleSelector.innerHTML = `
            <option value="dark">Dark</option>
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
        `;

        const mapStyleLabel = document.createElement('label');
        mapStyleLabel.textContent = 'Map Style: ';
        mapStyleLabel.appendChild(mapStyleSelector);

        radarControls.appendChild(mapStyleLabel);

        // Set up map style change event
        mapStyleSelector.addEventListener('change', (e) => {
            this.currentMapStyle = e.target.value;
            this.updateMapStyle();
        });

        // Initial map style
        this.updateMapStyle();

        // Add state and county boundaries
        fetch('https://raw.githubusercontent.com/Johan-dutoit/us-states-counties-geojson/master/states.json')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: {
                        color: '#444',
                        weight: 1,
                        opacity: 0.5,
                        fillOpacity: 0
                    }
                }).addTo(this.map);
            })
            .catch(error => console.error('Error loading state boundaries:', error));

        // Set up radar product selector
        const radarSelector = document.getElementById('radar-product');
        radarSelector.addEventListener('change', (e) => {
            this.currentProduct = e.target.value;
            this.updateRadar();
        });

        // Load initial radar
        this.updateRadar();

        // Set up refresh interval
        this.radarRefreshInterval = setInterval(() => {
            this.updateRadar();
        }, CONFIG.RADAR.refreshInterval);
    },

    /**
     * Update the map style based on user selection
     */
    updateMapStyle: function() {
        // Remove existing tile layer
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer && !layer._url.includes('mesonet.agron.iastate.edu')) {
                this.map.removeLayer(layer);
            }
        });

        // Add new tile layer based on selected style
        let tileLayer;

        switch(this.currentMapStyle) {
            case 'streets':
                tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: CONFIG.MAP.maxZoom
                });
                break;
            case 'satellite':
                tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    maxZoom: CONFIG.MAP.maxZoom
                });
                break;
            case 'terrain':
                tileLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
                    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    subdomains: 'abcd',
                    maxZoom: CONFIG.MAP.maxZoom
                });
                break;
            case 'dark':
            default:
                tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: CONFIG.MAP.maxZoom
                });
                break;
        }

        // Add the base map and ensure it's at the bottom
        tileLayer.addTo(this.map);
        tileLayer.bringToBack();

        // Make sure radar is on top if it exists
        if (this.radarLayer) {
            this.radarLayer.bringToFront();
        }
    },

    /**
     * Update the radar display
     */
    updateRadar: function() {
        // Remove existing radar layer if it exists
        if (this.radarLayer) {
            this.map.removeLayer(this.radarLayer);
        }

        // Get the radar URL based on product type
        const radarUrl = this.getRadarUrl(this.currentProduct);

        // Add the new radar layer
        this.radarLayer = L.tileLayer(radarUrl, {
            opacity: CONFIG.RADAR.opacity,
            attribution: 'Radar: NOAA/NWS'
        }).addTo(this.map);
    },

    /**
     * Get the appropriate radar URL for the selected product
     * @param {string} product - Radar product type
     * @returns {string} - Radar tile URL
     */
    getRadarUrl: function(product) {
        // Using Iowa Environmental Mesonet's tile server for radar imagery
        // Cache busting parameter to avoid stale images
        const cacheBuster = new Date().getTime();

        // Removed velocity and composite reflectivity radar options
        switch(product) {
            case 'reflectivity':
                // Base reflectivity
                return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?${cacheBuster}`;
            default:
                // Default to base reflectivity
                return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?${cacheBuster}`;
        }
    },

    /**
     * Add warning polygon to the map
     * @param {Object} geometry - GeoJSON geometry object
     * @param {string} type - Warning type for styling
     * @param {string} id - Warning ID
     */
    addWarningPolygon: function(geometry, type, id) {
        let color;

        // Set color based on warning type
        switch(type.toLowerCase()) {
            case 'tornado warning':
                color = '#FF0000'; // Red
                break;
            case 'severe thunderstorm warning':
                color = '#FFFF00'; // Yellow
                break;
            case 'flash flood warning':
                color = '#00FF00'; // Green
                break;
            default:
                color = '#FF00FF'; // Magenta for other warnings
        }

        // Add the polygon to the map
        L.geoJSON(geometry, {
            style: {
                color: color,
                weight: 2,
                opacity: 0.8,
                fillColor: color,
                fillOpacity: 0.2
            },
            id: `warning-${id}`
        }).addTo(this.map);
    },

    /**
     * Add watch polygon to the map
     * @param {Object} geometry - GeoJSON geometry object
     * @param {string} id - Watch ID
     * @param {string} type - Watch type (tornado, severe thunderstorm, etc.)
     */
    addWatchPolygon: function(geometry, id, type) {
        let color;

        // Set color based on watch type
        const typeLower = type.toLowerCase();
        if (typeLower.includes('tornado')) {
            color = '#FFFF00'; // Yellow for tornado watches
        } else if (typeLower.includes('thunderstorm')) {
            color = '#FF69B4'; // Darker pink for severe thunderstorm watches
        } else if (typeLower.includes('flash flood')) {
            color = '#006400'; // Dark green for flood watches
        } else {
            color = '#FFA500'; // Orange for other watches
        }

        // Add the polygon to the map
        const watchLayer = L.geoJSON(geometry, {
            style: {
                color: color,
                weight: 2,
                opacity: 0.7,
                fillColor: color,
                fillOpacity: 0.15
            }
        });

        // Store the watch layer by ID for later reference
        this.watchLayers[id] = watchLayer;

        // Add to map
        watchLayer.addTo(this.map);

        // Make sure warnings stay on top of watches
        Object.values(this.watchLayers).forEach(layer => layer.bringToBack());
    },

    /**
     * Clear all warning polygons from the map
     */
    clearWarningPolygons: function() {
        this.map.eachLayer((layer) => {
            if (layer.options && layer.options.id && layer.options.id.startsWith('warning-')) {
                this.map.removeLayer(layer);
            }
        });
    },

    /**
     * Clear all watch polygons from the map
     */
    clearWatchPolygons: function() {
        Object.values(this.watchLayers).forEach(layer => {
            this.map.removeLayer(layer);
        });
        this.watchLayers = {};
    },

    /**
     * Zoom to a specific warning polygon
     * @param {Object} geometry - GeoJSON geometry object
     */
    zoomToWarning: function(geometry) {
        const bounds = L.geoJSON(geometry).getBounds();
        this.map.fitBounds(bounds, { padding: [50, 50] });
    },

    /**
     * Cleanup resources
     */
    cleanup: function() {
        if (this.radarRefreshInterval) {
            clearInterval(this.radarRefreshInterval);
        }
    }
};