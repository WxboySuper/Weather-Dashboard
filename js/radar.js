/**
 * Radar functionality for the Severe Weather Monitoring Dashboard
 */

const RadarManager = {
    map: null,
    radarLayer: null,
    radarRefreshInterval: null,
    currentProduct: 'reflectivity',
    
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
        
        // Add dark theme map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: CONFIG.MAP.maxZoom
        }).addTo(this.map);
        
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
        // This uses Weather.gov's Ridge radar tiles as they're freely available
        // For MRMS data, you would need to use a different source
        
        // Cache busting parameter to avoid stale images
        const cacheBuster = new Date().getTime();
        
        switch(product) {
            case 'reflectivity':
                // Base reflectivity
                return `${CONFIG.WX_GOV_RADAR}/N0R/{z}/{x}/{y}.png?${cacheBuster}`;
            case 'velocity':
                // Base velocity
                return `${CONFIG.WX_GOV_RADAR}/N0V/{z}/{x}/{y}.png?${cacheBuster}`;
            case 'composite':
                // Composite reflectivity
                return `${CONFIG.WX_GOV_RADAR}/NCR/{z}/{x}/{y}.png?${cacheBuster}`;
            default:
                // Default to base reflectivity
                return `${CONFIG.WX_GOV_RADAR}/N0R/{z}/{x}/{y}.png?${cacheBuster}`;
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
            case 'flood warning':
                color = '#00FF00'; // Green
                break;
            case 'winter storm warning':
            case 'winter weather advisory':
                color = '#00FFFF'; // Cyan
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