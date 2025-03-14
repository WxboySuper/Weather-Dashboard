/**
 * Main application file for the Severe Weather Monitoring Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Initialize the radar component
    RadarManager.init();
    
    // Initialize the alerts component
    AlertsManager.init();
    
    // Initialize the SPC component
    SPCManager.init();
    
    // Event listener for window unload to clean up resources
    window.addEventListener('beforeunload', () => {
        RadarManager.cleanup();
        AlertsManager.cleanup();
        SPCManager.cleanup();
    });
    
    // Function to update the clock
    function updateClock() {
        Utils.updateClock();
    }

    // Add refresh counter display to the tabs
    const refreshCounters = {
        alerts: document.getElementById('alerts-refresh-counter'),
        radar: document.getElementById('radar-refresh-counter'),
        spc: document.getElementById('spc-refresh-counter')
    };

    // Updated refresh counter logic to increment and reset correctly
    function updateRefreshCounters() {
        refreshCounters.alerts.textContent = `Alerts Refresh: ${Math.floor(CONFIG.ALERTS.refreshInterval / 1000)} seconds`;
        refreshCounters.radar.textContent = `Radar Refresh: ${Math.floor(CONFIG.RADAR.refreshInterval / 1000)} seconds`;
        refreshCounters.spc.textContent = `SPC Refresh: ${Math.floor(CONFIG.SPC.refreshInterval / 1000)} seconds`;
    }

    // Countdown logic for refresh intervals
    setInterval(() => {
        CONFIG.ALERTS.refreshCounter = (CONFIG.ALERTS.refreshCounter + 1) % (CONFIG.ALERTS.refreshInterval / 1000);
        refreshCounters.alerts.textContent = `Alerts Refresh: ${CONFIG.ALERTS.refreshInterval / 1000 - CONFIG.ALERTS.refreshCounter} seconds`;
    }, 1000);

    setInterval(() => {
        CONFIG.RADAR.refreshCounter = (CONFIG.RADAR.refreshCounter + 1) % (CONFIG.RADAR.refreshInterval / 1000);
        refreshCounters.radar.textContent = `Radar Refresh: ${CONFIG.RADAR.refreshInterval / 1000 - CONFIG.RADAR.refreshCounter} seconds`;
    }, 1000);

    setInterval(() => {
        CONFIG.SPC.refreshCounter = (CONFIG.SPC.refreshCounter + 1) % (CONFIG.SPC.refreshInterval / 1000);
        refreshCounters.spc.textContent = `SPC Refresh: ${CONFIG.SPC.refreshInterval / 1000 - CONFIG.SPC.refreshCounter} seconds`;
    }, 1000);

    // Initial update
    updateRefreshCounters();
});