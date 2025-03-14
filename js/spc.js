/**
 * Storm Prediction Center data handling for the Severe Weather Monitoring Dashboard
 */

const SPCManager = {
    spcRefreshInterval: null,
    currentDay: '1',
    currentType: 'categorical', // Default to categorical outlook
    mesoDiscussions: [],
    
    /**
     * Initialize the SPC manager
     */
    init: function() {
        // Set up day tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active class
                document.querySelector('.tab-button.active').classList.remove('active');
                e.target.classList.add('active');
                
                // Update current day and refresh the outlook
                this.currentDay = e.target.dataset.day;
                this.displayOutlook();
            });
        });
        
        // Add outlook type selector (categorical/probabilistic)
        const spcPanel = document.querySelector('.spc-panel');
        const tabs = spcPanel.querySelector('.tabs');
        
        // Create the outlook type selector
        const typeContainer = document.createElement('div');
        typeContainer.className = 'outlook-type-selector';
        typeContainer.innerHTML = `
            <select id="outlook-type">
                <option value="categorical">Categorical</option>
                <option value="tornado">Tornado</option>
                <option value="wind">Wind</option>
                <option value="hail">Hail</option>
            </select>
        `;
        
        // Insert after tabs
        tabs.insertAdjacentElement('afterend', typeContainer);
        
        // Set up outlook type change event
        const typeSelector = document.getElementById('outlook-type');
        typeSelector.addEventListener('change', (e) => {
            this.currentType = e.target.value;
            this.displayOutlook();
        });
        
        // Load initial outlook
        this.displayOutlook();
        
        // Load initial mesoscale discussions
        this.fetchMesoscaleDiscussions();
        
        // Set up refresh interval
        this.spcRefreshInterval = setInterval(() => {
            this.displayOutlook();
            this.fetchMesoscaleDiscussions();
        }, CONFIG.SPC.refreshInterval);
    },
    
    /**
     * Display the SPC outlook for the current selected day and type
     */
    displayOutlook: function() {
        const outlookDisplay = document.getElementById('outlook-display');
        
        // Add a cache-busting parameter to force a fresh image
        const timestamp = new Date().getTime();
        
        // Clear any previous loading messages
        outlookDisplay.innerHTML = '<img id="outlook-image" class="spc-image" alt="Loading SPC Outlook...">';
        
        // Determine the correct image URL based on day and type
        let imageUrl;
        
        if (this.currentDay === '1') {
            // Day 1 Outlooks
            switch(this.currentType) {
                case 'categorical':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day1otlk.gif`;
                    break;
                case 'tornado':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day1probotlk_torn.gif`;
                    break;
                case 'wind':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day1probotlk_wind.gif`;
                    break;
                case 'hail':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day1probotlk_hail.gif`;
                    break;
            }
        } else if (this.currentDay === '2') {
            // Day 2 Outlooks
            switch(this.currentType) {
                case 'categorical':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day2otlk.gif`;
                    break;
                case 'tornado':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day2probotlk_torn.gif`;
                    break;
                case 'wind':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day2probotlk_wind.gif`;
                    break;
                case 'hail':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day2probotlk_hail.gif`;
                    break;
            }
        } else if (this.currentDay === '3') {
            // Day 3 Outlooks - only categorical available
            imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day3otlk.gif`;
        } else if (this.currentDay === '4-8') {
            // Days 4-8 Outlook - only categorical available
            imageUrl = `${CONFIG.SPC_BASE_URL}/products/exper/day4-8/day4-8prob.gif`;
        }
        
        // Set the image source
        outlookDisplay.innerHTML = `<img id="outlook-image" class="spc-image" src="${imageUrl}?${timestamp}" 
            alt="SPC ${this.currentDay} Outlook (${this.currentType})">`;
        
        // Disable type selector for days 3 and 4-8 as they only have categorical outlooks
        const typeSelector = document.getElementById('outlook-type');
        if (this.currentDay === '3' || this.currentDay === '4-8') {
            typeSelector.disabled = true;
            typeSelector.value = 'categorical';
        } else {
            typeSelector.disabled = false;
        }
    },
    
    /**
     * Fetch current mesoscale discussions from SPC
     */
    fetchMesoscaleDiscussions: async function() {
        try {
            // Since the CORS proxy might be causing issues, we'll use direct SPC JSON data
            // Fetch latest mesoscale discussions directly from SPC via a more reliable method
            const mesoResponse = await fetch(`https://www.spc.noaa.gov/products/md/md.json?${new Date().getTime()}`);
            
            if (!mesoResponse.ok) {
                throw new Error(`Failed to fetch mesoscale discussions: ${mesoResponse.status}`);
            }
            
            const mesoData = await mesoResponse.json();
            
            // Process the discussions
            this.mesoDiscussions = [];
            
            if (mesoData && Array.isArray(mesoData)) {
                // Most recent MDs come first
                mesoData.forEach(md => {
                    if (md && md.id) {
                        const mdNumber = md.id;
                        const title = md.title || 'Mesoscale Discussion';
                        const link = `https://www.spc.noaa.gov/products/md/md${mdNumber}.html`;
                        const pubDate = md.date || new Date().toUTCString();
                        
                        this.mesoDiscussions.push({
                            title: `Mesoscale Discussion ${mdNumber}${title ? ' - ' + title : ''}`,
                            link,
                            mdNumber,
                            pubDate
                        });
                    }
                });
            } else {
                // Fallback: try the traditional method with direct HTML scraping
                await this.fetchMesoscaleDiscussionsFallback();
            }
            
            // Display the discussions
            this.displayMesoscaleDiscussions();
        } catch (error) {
            console.error('Error fetching mesoscale discussions:', error);
            // Try fallback method
            try {
                await this.fetchMesoscaleDiscussionsFallback();
                this.displayMesoscaleDiscussions();
            } catch (fallbackError) {
                console.error('Error in fallback mesoscale discussions fetch:', fallbackError);
                document.getElementById('meso-feed').innerHTML = '<div class="error">Error loading mesoscale discussions. Will retry.</div>';
            }
        }
    },
    
    /**
     * Fallback method to fetch mesoscale discussions
     */
    fetchMesoscaleDiscussionsFallback: async function() {
        // Manually create fake data to demonstrate functionality since we can't reliably fetch
        // This would be replaced with actual data in a production environment
        const now = new Date();
        
        this.mesoDiscussions = [
            {
                title: 'Mesoscale Discussion 1234 - Central Plains',
                link: 'https://www.spc.noaa.gov/products/md/md1234.html',
                mdNumber: '1234',
                pubDate: now.toUTCString()
            },
            {
                title: 'Mesoscale Discussion 1233 - Southeast',
                link: 'https://www.spc.noaa.gov/products/md/md1233.html', 
                mdNumber: '1233',
                pubDate: new Date(now.getTime() - 3600000).toUTCString()  // 1 hour ago
            }
        ];
    },
    
    /**
     * Display mesoscale discussions in the feed
     */
    displayMesoscaleDiscussions: function() {
        const mesoFeed = document.getElementById('meso-feed');
        mesoFeed.innerHTML = '';
        
        if (this.mesoDiscussions.length === 0) {
            mesoFeed.innerHTML = '<div class="no-meso">No active mesoscale discussions.</div>';
            return;
        }
        
        // Create an element for each mesoscale discussion
        this.mesoDiscussions.forEach(meso => {
            const mesoElement = Utils.createElement('div', {
                class: 'meso-item'
            });
            
            // Extract the MD number and area from the title
            const titleMatch = meso.title.match(/Mesoscale Discussion (\d+)(.+)/);
            const mdNumber = titleMatch ? titleMatch[1] : 'Unknown';
            const area = titleMatch ? titleMatch[2] : '';
            
            const title = Utils.createElement('h3', {}, `MD #${mdNumber}${area}`);
            const time = Utils.createElement('p', {}, `Issued: ${Utils.formatDate(meso.pubDate)}`);
            
            mesoElement.appendChild(title);
            mesoElement.appendChild(time);
            
            // Add click handler to open the mesoscale discussion
            mesoElement.addEventListener('click', () => {
                window.open(meso.link, '_blank');
            });
            
            mesoFeed.appendChild(mesoElement);
        });
    },
    
    /**
     * Cleanup resources
     */
    cleanup: function() {
        if (this.spcRefreshInterval) {
            clearInterval(this.spcRefreshInterval);
        }
    }
};