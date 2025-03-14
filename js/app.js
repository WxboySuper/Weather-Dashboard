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

    // Add functionality to enable or disable sound effects with visual confirmation
    const soundToggle = document.getElementById('sound-toggle');
    const soundToggleLabel = document.querySelector('.sound-toggle');
    let soundEnabled = true;

    // Add debugging logs to verify sound toggle behavior
    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        console.log(`Sound Enabled: ${soundEnabled}`); // Debugging log
        if (soundEnabled) {
            soundToggleLabel.classList.add('enabled');
            soundToggleLabel.classList.remove('disabled');
        } else {
            soundToggleLabel.classList.add('disabled');
            soundToggleLabel.classList.remove('enabled');
        }
    });

    // Add debugging log in triggerNotification
    function triggerNotification(title, message, type, audioFile) {
        console.log(`Triggering notification: ${title}, Sound Enabled: ${soundEnabled}, Audio File: ${audioFile}`); // Debugging log

        // Create notification element
        const notificationContainer = document.querySelector('.notification-container');
        const notification = Utils.createElement('div', {
            class: `notification ${type}`
        });

        const notificationTitle = Utils.createElement('div', {
            class: 'notification-title'
        }, title);

        const notificationBody = Utils.createElement('div', {
            class: 'notification-body'
        }, message);

        const closeButton = Utils.createElement('div', {
            class: 'notification-close'
        }, '×');

        closeButton.addEventListener('click', () => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        });

        notification.appendChild(notificationTitle);
        notification.appendChild(notificationBody);
        notification.appendChild(closeButton);
        notificationContainer.appendChild(notification);

        // Play sound if enabled
        if (soundEnabled && audioFile) {
            const audio = new Audio(audioFile);
            audio.play();
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
});