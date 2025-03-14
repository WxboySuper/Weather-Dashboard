/**
 * Configuration settings for the Severe Weather Monitoring Dashboard
 */
const CONFIG = {
    // NWS API base URL
    NWS_API_BASE: 'https://api.weather.gov',
    
    // SPC website base URL
    SPC_BASE_URL: 'https://www.spc.noaa.gov',
    
    // NOAA MRMS base URL
    NOAA_RADAR_BASE: 'https://mrms.ncep.noaa.gov/data',
    
    // Weather.gov Radar base URL (alternative for MRMS)
    WX_GOV_RADAR: 'https://radar.weather.gov/ridge/standard',
    
    // Default map settings
    MAP: {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        maxZoom: 13
    },
    
    // Radar settings
    RADAR: {
        opacity: 0.7,
        refreshInterval: 300000 // 5 minutes in milliseconds
    },
    
    // Alert settings
    ALERTS: {
        refreshInterval: 120000 // 2 minutes in milliseconds
    },
    
    // SPC settings
    SPC: {
        refreshInterval: 600000 // 10 minutes in milliseconds
    },
    
    // Time format settings
    TIME_FORMAT: {
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    }
};