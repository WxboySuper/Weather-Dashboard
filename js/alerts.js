/**
 * Weather alerts functionality for the Severe Weather Monitoring Dashboard
 */

const AlertsManager = {
    alertsRefreshInterval: null,
    activeAlerts: [],
    activeFilters: ['warning', 'watch', 'advisory'],
    // Add a flag to track the first load
    isFirstLoad: true,

    /**
     * Initialize the alerts manager
     */
    init: function() {
        // Set up alert filters
        const filterCheckboxes = document.querySelectorAll('.alert-filter');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeFilters.push(e.target.value);
                } else {
                    const index = this.activeFilters.indexOf(e.target.value);
                    if (index !== -1) {
                        this.activeFilters.splice(index, 1);
                    }
                }
                this.displayAlerts();
            });
        });

        // Load initial alerts
        this.fetchAlerts();

        // Set up refresh interval
        this.alertsRefreshInterval = setInterval(() => {
            this.fetchAlerts();
        }, CONFIG.ALERTS.refreshInterval);

        // Setup modal close button
        const closeButton = document.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            document.getElementById('alert-modal').style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('alert-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    },

    /**
     * Fetch active alerts from NWS API
     */
    fetchAlerts: async function() {
        try {
            const alertsUrl = `${CONFIG.NWS_API_BASE}/alerts/active?status=actual`;

            // Set a timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

            const response = await fetch(alertsUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch alerts: ${response.status}`);
            }

            const data = await response.json();

            // Process and store alerts
            const previousAlerts = this.activeAlerts.map(alert => alert.id);
            this.processAlerts(data);

            // Trigger notifications for new alerts only after the first load
            if (!this.isFirstLoad) {
                let delay = 0;
                this.activeAlerts.forEach(alert => {
                    if (!previousAlerts.includes(alert.id)) {
                        setTimeout(() => {
                            const audioFile = this.getAudioFileForAlert(alert);
                            this.triggerNotification(alert.event, alert.headline, 'alert', audioFile, alert.areaDesc);
                        }, delay);
                        delay += 1000; // Add 1 second delay between notifications
                    }
                });
            } else {
                this.isFirstLoad = false;
            }

            // Display the alerts
            this.displayAlerts();

            // Update map with warning polygons
            this.updateWarningPolygons();
        } catch (error) {
            console.error('Error fetching alerts:', error);
            document.getElementById('warning-feed').innerHTML = '<div class="error">Error loading alert data. Will retry.</div>';
        }
    },

    /**
     * Get the appropriate audio file for an alert
     * @param {Object} alert - Alert object
     * @returns {string} - Path to the audio file
     */
    getAudioFileForAlert: function(alert) {
        const eventLower = alert.event.toLowerCase();

        if (eventLower.includes('tornado warning')) {
            return 'assets/tor-notification.mp3';
        } else if (eventLower.includes('severe thunderstorm warning') || eventLower.includes('flash flood warning')) {
            return 'assets/alert-notification.mp3';
        } else if (eventLower.includes('watch')) {
            return 'assets/watch-notification.mp3';
        } else {
            return 'assets/info-notification.mp3';
        }
    },

    /**
     * Process alerts from NWS API
     * @param {Object} data - Alert data from NWS API
     */
    processAlerts: function(data) {
        // Filter for severe weather alerts only with specific order of importance
        const severeWeatherEvents = [
            'tornado warning',
            'severe thunderstorm warning',
            'flash flood warning',
            'tornado watch',
            'severe thunderstorm watch',
            'flash flood watch'
        ];

        const validAlerts = data.features.filter(alert => {
            if (!alert.properties || !alert.properties.event) return false;
            const eventLower = alert.properties.event.toLowerCase();
            return severeWeatherEvents.some(severeEvent => eventLower.includes(severeEvent));
        });

        // Store the alerts
        this.activeAlerts = validAlerts.map(alert => {
            const props = alert.properties;
            const eventLower = props.event.toLowerCase();

            // Extract damage threat tag from description if available
            let damageThreatTag = null;
            if (props.description) {
                const descLower = props.description.toLowerCase();

                // Check for tornado damage threat tags
                if (eventLower.includes('tornado')) {
                    if (descLower.includes('catastrophic')) damageThreatTag = 'TORNADO EMERGENCY';
                    else if (descLower.includes('tornado emergency')) damageThreatTag = 'EMERGENCY';
                    else if (descLower.includes('considerable')) damageThreatTag = 'PARTICULARILY DANGEROUS SITUATION';
                    else if (descLower.includes('POSSIBLE')) damageThreatTag = 'TORNADO POSSIBLE';
                    else if (descLower.includes('radar indicated')) damageThreatTag = 'RADAR INDICATED';
                    else if (descLower.includes('observed')) damageThreatTag = 'OBSERVED';
                    else if (descLower.includes('confirmed')) damageThreatTag = 'OBSERVED';
                }
                // Check for thunderstorm damage threat tags
                else if (eventLower.includes('thunderstorm')) {
                    if (descLower.includes('destructive')) damageThreatTag = 'DESTRUCTIVE DAMAGE THREAT';
                    else if (descLower.includes('considerable')) damageThreatTag = 'CONSIDERABLE DAMAGE THREAT';
                    else if (descLower.includes('tornado')) damageThreatTag = 'TORNADO POSSIBLE';
                }
                // Check for flash flood damage threat tags
                else if (eventLower.includes('flash flood')) {
                    if (descLower.includes('flash flood emergency')) damageThreatTag = 'FLASH FLOOD EMERGENCY';
                    else if (descLower.includes('considerable')) damageThreatTag = 'CONSIDERABLE FLOOD THREAT';
                    else if (descLower.includes('catastrophic')) damageThreatTag = 'FLASH FLOOD EMERGENCY';
                }
            }

            // Determine priority based on alert type
            let priority = 999;
            severeWeatherEvents.forEach((severeEvent, index) => {
                if (eventLower.includes(severeEvent)) {
                    priority = Math.min(priority, index);

                    // Higher priority for tagged alerts
                    if (damageThreatTag) {
                        if (damageThreatTag.includes('CATASTROPHIC') || 
                            damageThreatTag.includes('DESTRUCTIVE') ||
                            damageThreatTag.includes('EMERGENCY')) {
                            priority -= 0.3; // Highest priority
                        } else if (damageThreatTag.includes('CONSIDERABLE')) {
                            priority -= 0.2; // High priority
                        } else if (damageThreatTag.includes('OBSERVED')) {
                            priority -= 0.1; // Medium priority
                        }
                    }
                }
            });

            return {
                id: props.id,
                event: props.event,
                headline: props.headline,
                description: props.description,
                instruction: props.instruction,
                severity: props.severity,
                urgency: props.urgency,
                areaDesc: props.areaDesc,
                effective: props.effective,
                expires: props.expires,
                geometry: alert.geometry,
                type: this.getCategoryType(props.event),
                priority: priority, // Lower number = higher priority
                damageThreatTag: damageThreatTag // Added damage threat tag
            };
        });

        // Sort by priority (most severe first)
        this.activeAlerts.sort((a, b) => a.priority - b.priority);

        // Update alert counters
        this.updateAlertCounters();
    },

    // Update alert counters
    updateAlertCounters: function() {
        // Initialize counters
        const counters = {
            'tornado-warning': 0,
            'tstorm-warning': 0,
            'flood-warning': 0,
            'tornado-watch': 0,
            'tstorm-watch': 0,
            'flood-watch': 0
        };

        // Count alerts by type
        this.activeAlerts.forEach(alert => {
            const eventLower = alert.event.toLowerCase();
            if (eventLower.includes('tornado warning')) counters['tornado-warning']++;
            else if (eventLower.includes('thunderstorm warning')) counters['tstorm-warning']++;
            else if (eventLower.includes('flash flood warning')) counters['flood-warning']++;
            else if (eventLower.includes('tornado watch')) counters['tornado-watch']++;
            else if (eventLower.includes('thunderstorm watch')) counters['tstorm-watch']++;
            else if (eventLower.includes('flash flood watch')) counters['flood-watch']++;
        });

        // Create or update the counter display
        const warningsPanel = document.querySelector('.warnings-panel');
        let counterDisplay = document.getElementById('alert-counters');

        if (!counterDisplay) {
            counterDisplay = document.createElement('div');
            counterDisplay.id = 'alert-counters';
            counterDisplay.className = 'alert-counters';

            // Insert after the h2 title
            const title = warningsPanel.querySelector('h2');
            title.parentNode.insertBefore(counterDisplay, title.nextSibling);
        }

        // Update counter display with specific classes for each type
        counterDisplay.innerHTML = `
            <div class="counter-item tornado">${counters['tornado-warning']} TOR</div>
            <div class="counter-item severe-tstorm">${counters['tstorm-warning']} SVR</div>
            <div class="counter-item flood">${counters['flood-warning']} FFW</div>
            <div class="counter-item watch tornado-watch">${counters['tornado-watch']} TOR WTCH</div>
            <div class="counter-item watch tstorm-watch">${counters['tstorm-watch']} SVR WTCH</div>
            <div class="counter-item watch flood-watch">${counters['flood-watch']} FFW WTCH</div>
        `;
    },

    /**
     * Determine the category type of an alert
     * @param {string} event - Alert event name
     * @returns {string} - Category type (warning, watch, advisory)
     */
    getCategoryType: function(event) {
        const eventLower = event.toLowerCase();
        if (eventLower.includes('warning')) return 'warning';
        if (eventLower.includes('watch')) return 'watch';
        return 'other';
    },

    /**
     * Display alerts in the warning feed
     */
    displayAlerts: function() {
        const warningFeed = document.getElementById('warning-feed');
        warningFeed.innerHTML = '';

        // Filter alerts based on active filters
        const filteredAlerts = this.activeAlerts.filter(alert =>
            this.activeFilters.includes(alert.type)
        );

        if (filteredAlerts.length === 0) {
            warningFeed.innerHTML = '<div class="no-alerts">No active alerts match your filters.</div>';
            return;
        }

        // Removed 'New' and 'Updated' logic for alerts
        filteredAlerts.forEach(alert => {
            const alertElement = Utils.createElement('div', {
                class: `warning-item ${Utils.getAlertClass(alert.event)}`,
                'data-id': alert.id
            });

            const title = Utils.createElement('h3', {}, alert.event);

            // Add damage threat tag if available
            if (alert.damageThreatTag) {
                const tagElement = Utils.createElement('div', { 
                    class: 'damage-threat-tag'
                }, alert.damageThreatTag);
                alertElement.appendChild(tagElement);
            }

            // Add tornado-specific details if available
            if (alert.event.toLowerCase().includes('tornado')) {
                const descLower = alert.description.toLowerCase();
                let tornadoDetails = '';

                if (tornadoDetails) {
                    const tornadoDetailElement = Utils.createElement('div', {
                        class: 'damage-threat-tag'
                    }, tornadoDetails);
                    alertElement.appendChild(tornadoDetailElement);
                }
            }

            const area = Utils.createElement('p', {}, alert.areaDesc);
            const time = Utils.createElement('p', {}, `Until: ${Utils.formatDate(alert.expires)}`);

            alertElement.appendChild(title);
            alertElement.appendChild(area);
            alertElement.appendChild(time);

            // Add click handler to show full alert details
            alertElement.addEventListener('click', () => this.showAlertDetails(alert));

            warningFeed.appendChild(alertElement);
        });
    },

    /**
     * Update warning polygons on the map
     */
    updateWarningPolygons: function() {
        // Clear existing warning polygons and watches
        RadarManager.clearWarningPolygons();
        RadarManager.clearWatchPolygons();

        // Add polygons for each alert with geometry
        this.activeAlerts.forEach(alert => {
            if (alert.geometry) {
                const eventLower = alert.event.toLowerCase();

                if (eventLower.includes('watch')) {
                    // Add as a watch polygon with lower opacity
                    RadarManager.addWatchPolygon(alert.geometry, alert.id, alert.event);
                } else {
                    // Add as a warning polygon
                    RadarManager.addWarningPolygon(alert.geometry, alert.event, alert.id);
                }
            }
        });
    },

    /**
     * Show detailed information for a specific alert
     * @param {Object} alert - Alert object
     */
    showAlertDetails: function(alert) {
        const modal = document.getElementById('alert-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');

        modalTitle.textContent = alert.event;

        let content = `
            <p class="alert-headline">${alert.headline}</p>
            <div class="alert-meta">
                <p><strong>Area:</strong> ${alert.areaDesc}</p>
                <p><strong>Effective:</strong> ${Utils.formatDate(alert.effective)}</p>
                <p><strong>Expires:</strong> ${Utils.formatDate(alert.expires)}</p>
                <p><strong>Severity:</strong> ${alert.severity}</p>
                <p><strong>Urgency:</strong> ${alert.urgency}</p>
            </div>
            <div class="alert-description">
                <h4>Description</h4>
                <p>${alert.description.replace(/\n/g, '<br>')}</p>
            </div>
        `;

        if (alert.instruction) {
            content += `
                <div class="alert-instructions">
                    <h4>Instructions</h4>
                    <p>${alert.instruction.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        modalContent.innerHTML = content;

        // Show the modal
        modal.style.display = 'block';

        // If the alert has geometry, zoom to it
        if (alert.geometry) {
            RadarManager.zoomToWarning(alert.geometry);
        }
    },

    /**
     * Cleanup resources
     */
    cleanup: function() {
        if (this.alertsRefreshInterval) {
            clearInterval(this.alertsRefreshInterval);
        }
    },

    // Fix to ensure counties are displayed correctly in notifications
    triggerNotification: function(title, message, type, audioFile, areaDesc) {
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
        }, `${message} - Counties: ${areaDesc}`); // Use areaDesc parameter

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

        // Play sound
        const audio = new Audio(audioFile);
        audio.play();

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
};