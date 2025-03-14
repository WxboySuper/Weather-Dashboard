/**
 * Utility functions for the Severe Weather Monitoring Dashboard
 */

const Utils = {
    /**
     * Format a date for display
     * @param {string|Date} dateString - Date string or Date object
     * @param {boolean} includeTime - Whether to include time in the formatted string
     * @returns {string} - Formatted date string
     */
    formatDate: function(dateString, includeTime = true) {
        const date = new Date(dateString);
        const options = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        
        if (includeTime) {
            options.hour = 'numeric';
            options.minute = '2-digit';
            options.hour12 = true;
        }
        
        return date.toLocaleString('en-US', options);
    },
    
    /**
     * Format a UTC date to local time
     * @param {string} utcDateString - UTC date string
     * @returns {string} - Formatted local date string
     */
    formatUTCtoLocal: function(utcDateString) {
        const date = new Date(utcDateString);
        return date.toLocaleString('en-US', CONFIG.TIME_FORMAT);
    },
    
    /**
     * Get alert type class based on event type
     * @param {string} eventType - NWS event type
     * @returns {string} - CSS class name
     */
    getAlertClass: function(eventType) {
        const type = eventType.toLowerCase();
        
        if (type.includes('tornado')) return 'tornado';
        if (type.includes('thunderstorm')) return 'severe-tstorm';
        if (type.includes('flash flood') || type.includes('flood')) return 'flood';
        if (type.includes('winter') || type.includes('snow') || type.includes('ice')) return 'winter';
        if (type.includes('watch')) return 'watch';
        
        return 'other';
    },
    
    /**
     * Fetch data from API with error handling and timeout
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to the response JSON
     */
    fetchWithTimeout: async function(url, options = {}) {
        const timeout = options.timeout || 10000; // Default 10s timeout
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/geo+json',
                    ...(options.headers || {})
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            throw error;
        }
    },
    
    /**
     * Update the current time display
     */
    updateClock: function() {
        const now = new Date();
        const timeDisplay = document.getElementById('current-time');
        timeDisplay.textContent = now.toLocaleString('en-US', CONFIG.TIME_FORMAT);
    },
    
    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color code
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} - RGBA color string
     */
    hexToRgba: function(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    /**
     * Create an element with attributes and text content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|null} textContent - Element text content
     * @returns {HTMLElement} - Created element
     */
    createElement: function(tag, attributes = {}, textContent = null) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (textContent !== null) {
            element.textContent = textContent;
        }
        
        return element;
    }
};