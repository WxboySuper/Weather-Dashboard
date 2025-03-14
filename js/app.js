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
});