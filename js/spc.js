/**
 * Storm Prediction Center data handling for the Severe Weather Monitoring Dashboard
 */

const SPCManager = {
    spcRefreshInterval: null,
    currentDay: '1',
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
     * Display the SPC outlook for the current selected day
     */
    displayOutlook: function() {
        const outlookImage = document.getElementById('outlook-image');
        
        // Add a cache-busting parameter to force a fresh image
        const timestamp = new Date().getTime();
        
        // Set the image source based on the selected day
        if (this.currentDay === '1') {
            // Day 1 Categorical Outlook
            outlookImage.src = `${CONFIG.SPC_BASE_URL}/products/outlook/day1otlk_cat.gif?${timestamp}`;
            outlookImage.alt = 'Day 1 Convective Outlook';
        } else if (this.currentDay === '2') {
            // Day 2 Categorical Outlook
            outlookImage.src = `${CONFIG.SPC_BASE_URL}/products/outlook/day2otlk_cat.gif?${timestamp}`;
            outlookImage.alt = 'Day 2 Convective Outlook';
        } else if (this.currentDay === '3') {
            // Day 3 Categorical Outlook
            outlookImage.src = `${CONFIG.SPC_BASE_URL}/products/outlook/day3otlk_cat.gif?${timestamp}`;
            outlookImage.alt = 'Day 3 Convective Outlook';
        } else if (this.currentDay === '4-8') {
            // Days 4-8 Outlook
            outlookImage.src = `${CONFIG.SPC_BASE_URL}/products/exper/day4-8/day4prob.gif?${timestamp}`;
            outlookImage.alt = 'Days 4-8 Convective Outlook';
        }
    },
    
    /**
     * Fetch current mesoscale discussions from SPC
     */
    fetchMesoscaleDiscussions: async function() {
        try {
            // Fetch the SPC mesoscale discussions XML feed
            // We'll use a CORS proxy to avoid CORS issues
            const corsProxy = 'https://corsproxy.io/?';
            const mesoUrl = `${corsProxy}${encodeURIComponent(`${CONFIG.SPC_BASE_URL}/products/md/rss.xml`)}`;
            
            const response = await fetch(mesoUrl);
            const text = await response.text();
            
            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const items = xmlDoc.querySelectorAll('item');
            
            // Process the discussions
            this.mesoDiscussions = [];
            items.forEach(item => {
                const title = item.querySelector('title').textContent;
                const link = item.querySelector('link').textContent;
                const description = item.querySelector('description').textContent;
                const pubDate = item.querySelector('pubDate').textContent;
                
                this.mesoDiscussions.push({
                    title,
                    link,
                    description,
                    pubDate
                });
            });
            
            // Display the discussions
            this.displayMesoscaleDiscussions();
        } catch (error) {
            console.error('Error fetching mesoscale discussions:', error);
            document.getElementById('meso-feed').innerHTML = '<div class="error">Error loading mesoscale discussions. Will retry.</div>';
        }
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