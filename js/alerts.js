/**
 * Weather alerts functionality for the Severe Weather Monitoring Dashboard
 */

const AlertsManager = {
    alertsRefreshInterval: null,
    activeAlerts: [],
    activeFilters: ['warning', 'watch', 'advisory'],
    
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
            const data = await Utils.fetchWithTimeout(alertsUrl);
            
            // Process and store alerts
            this.processAlerts(data);
            
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
     * Process alerts from NWS API
     * @param {Object} data - Alert data from NWS API
     */
    processAlerts: function(data) {
        // Only use alerts with a defined event (warning, watch, etc.)
        const validAlerts = data.features.filter(alert => 
            alert.properties && 
            alert.properties.event && 
            (alert.properties.event.toLowerCase().includes('warning') || 
             alert.properties.event.toLowerCase().includes('watch') ||
             alert.properties.event.toLowerCase().includes('advisory'))
        );
        
        // Store the alerts
        this.activeAlerts = validAlerts.map(alert => {
            const props = alert.properties;
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
                type: this.getCategoryType(props.event)
            };
        });
        
        // Sort by severity (most severe first)
        this.activeAlerts.sort((a, b) => {
            const severityOrder = { extreme: 0, severe: 1, moderate: 2, minor: 3, unknown: 4 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
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
        if (eventLower.includes('advisory')) return 'advisory';
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
        
        // Create an element for each alert
        filteredAlerts.forEach(alert => {
            const alertElement = Utils.createElement('div', {
                class: `warning-item ${Utils.getAlertClass(alert.event)}`,
                'data-id': alert.id
            });
            
            const title = Utils.createElement('h3', {}, alert.event);
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
        // Clear existing warning polygons
        RadarManager.clearWarningPolygons();
        
        // Add polygons for each alert with geometry
        this.activeAlerts.forEach(alert => {
            if (alert.geometry) {
                RadarManager.addWarningPolygon(alert.geometry, alert.event, alert.id);
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
    }
};