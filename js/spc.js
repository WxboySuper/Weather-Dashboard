/**
 * Storm Prediction Center data handling for the Severe Weather Monitoring Dashboard
 */

let isFirstLoad = true;

const SPCManager = {
    spcRefreshInterval: null,
    currentDay: '1',
    currentType: 'categorical', // Default to categorical outlook
    mesoDiscussions: [],
    
    /**
     * Initialize the SPC manager
     */
    init: function() {
        // Ensure isFirstLoad is reset during initialization
        isFirstLoad = true;

        // Set up day tab buttons (for SPC day selection)
        const dayTabButtons = document.querySelectorAll('.spc-day-tabs .tab-button');
        dayTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active class
                const activeButton = document.querySelector('.spc-day-tabs .tab-button.active');
                if (activeButton) activeButton.classList.remove('active');
                e.target.classList.add('active');
                
                // Update current day and refresh the outlook
                this.currentDay = e.target.dataset.day;
                this.displayOutlook();
            });
        });
        
        // Set up panel tab buttons (for switching between SPC and MCD)
        const panelTabButtons = document.querySelectorAll('.panel-tab-button');
        panelTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active class
                const activeButton = document.querySelector('.panel-tab-button.active');
                if (activeButton) activeButton.classList.remove('active');
                e.target.classList.add('active');
                
                // Hide all panel content
                document.querySelectorAll('.panel-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show the selected panel content
                const panelId = e.target.dataset.panel;
                const panelContent = document.getElementById(`${panelId}-content`);
                if (panelContent) panelContent.classList.add('active');
                
                // If switching to MCD tab, make sure MCDs are loaded
                if (panelId === 'mcd') {
                    this.fetchMesoscaleDiscussions();
                }
            });
        });
        
        // Set up outlook type selector
        const typeSelector = document.getElementById('outlook-type');
        if (typeSelector) {
            typeSelector.addEventListener('change', (e) => {
                this.currentType = e.target.value;
                this.displayOutlook();
            });
            
            // Make sure the selector shows the current type
            typeSelector.value = this.currentType;
        }
        
        // Load initial outlook
        this.displayOutlook();
        
        // Load initial mesoscale discussions
        this.fetchMesoscaleDiscussions();
        
        // Set up refresh interval
        this.spcRefreshInterval = setInterval(() => {
            // Only refresh the active tab content
            const activePanel = document.querySelector('.panel-content.active');
            if (activePanel) {
                const panelId = activePanel.id;
                if (panelId === 'spc-content') {
                    this.displayOutlook();
                } else if (panelId === 'mcd-content') {
                    this.fetchMesoscaleDiscussions();
                }
            }
        }, CONFIG.SPC.refreshInterval);
    },
    
    /**
     * Display the SPC outlook for the current selected day and type
     */
    displayOutlook: function() {
        const outlookDisplay = document.getElementById('outlook-display');
        if (!outlookDisplay) return;
        
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
                default:
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day1otlk.gif`;
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
                default:
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day2otlk.gif`;
            }
        } else if (this.currentDay === '3') {
            // Day 3 Outlooks - both categorical and probabilistic are available
            switch(this.currentType) {
                case 'categorical':
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day3otlk.gif`;
                    break;
                case 'tornado':
                case 'wind':
                case 'hail':
                    // Day 3 only has a single probabilistic outlook
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day3prob.gif`;
                    break;
                default:
                    imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day3otlk.gif`;
            }
        } else if (this.currentDay === '4-8') {
            // Days 4-8 Outlook - fixed URL to correct location
            imageUrl = `${CONFIG.SPC_BASE_URL}/products/outlook/day4-8/day4-8prob.gif`;
        }
        
        // Set the image source
        const img = new Image();
        img.onload = function() {
            outlookDisplay.innerHTML = '';
            outlookDisplay.appendChild(img);
        };
        img.onerror = function() {
            outlookDisplay.innerHTML = '<div class="error">Failed to load outlook image. Will retry.</div>';
        };
        img.src = `${imageUrl}?${timestamp}`;
        img.id = 'outlook-image';
        img.className = 'spc-image';
        img.alt = `SPC ${this.currentDay} Outlook (${this.currentType})`;
        
        // Handle selector for days 3 - allow probabilistic but set single option
        const typeSelector = document.getElementById('outlook-type');
        if (typeSelector) {
            if (this.currentDay === '3') {
                typeSelector.disabled = false;
                // If any probabilistic type is selected, they're all the same for day 3
                if (this.currentType !== 'categorical' && 
                    (this.currentType === 'tornado' || this.currentType === 'wind' || this.currentType === 'hail')) {
                    // Just use a single value for all probabilistic types on day 3
                    this.currentType = 'tornado';
                    typeSelector.value = this.currentType;
                } else {
                    typeSelector.value = this.currentType;
                }
            } else if (this.currentDay === '4-8') {
                typeSelector.disabled = true;
                typeSelector.value = 'categorical';
                this.currentType = 'categorical';
            } else {
                typeSelector.disabled = false;
                typeSelector.value = this.currentType;
            }
        }
    },

    /**
     * Fetch current mesoscale discussions from SPC using RSS feed as primary source
     */
    fetchMesoscaleDiscussions: async function() {
        const mesoFeed = document.getElementById('meso-feed');
        if (!mesoFeed) return;

        try {
            mesoFeed.innerHTML = '<div class="loading">Loading mesoscale discussions...</div>';

            const response = await fetch(`https://www.spc.noaa.gov/products/spcmdrss.xml?${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch from RSS: ${response.status}`);
            }

            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const items = xmlDoc.querySelectorAll('item');

            const previousMCDs = this.mesoDiscussions.map(meso => meso.mdNumber);
            this.mesoDiscussions = [];

            if (items && items.length > 0) {
                let delay = 0;
                items.forEach(item => {
                    try {
                        const title = item.querySelector('title').textContent;
                        const description = item.querySelector('description').textContent;
                        const pubDate = item.querySelector('pubDate').textContent;

                        const mdMatch = title.match(/MD\s*(\d+)/i);
                        if (mdMatch) {
                            const mdNumber = mdMatch[1];
                            const paddedMdNumber = mdNumber.padStart(4, '0');

                            this.mesoDiscussions.push({
                                title: `MD #${mdNumber}`,
                                link: `https://www.spc.noaa.gov/products/md/md${paddedMdNumber}.html`,
                                description: description,
                                mdNumber: paddedMdNumber,
                                pubDate: pubDate
                            });

                            if (!isFirstLoad && !previousMCDs.includes(paddedMdNumber)) {
                                setTimeout(() => {
                                    this.triggerNotification(`New MCD #${mdNumber}`, `A new Mesoscale Discussion (MCD #${mdNumber}) has been issued.`, 'mcd');
                                }, delay);
                                delay += 1000; // Add 1 second delay between notifications
                            }
                        }
                    } catch (itemError) {
                        console.error('Error processing RSS item:', itemError);
                    }
                });
            }

            if (this.mesoDiscussions.length === 0) {
                await this.fetchMCDsFromDirectPage();
            } else {
                this.displayMesoscaleDiscussions();
            }

            isFirstLoad = false;
        } catch (error) {
            console.error('Error fetching from RSS feed:', error);
            await this.fetchMCDsFromDirectPage();
        }
    },

    /**
     * Backup method to fetch MCDs directly from the MD page
     */
    fetchMCDsFromDirectPage: async function() {
        const mesoFeed = document.getElementById('meso-feed');
        if (!mesoFeed) return;

        try {
            mesoFeed.innerHTML = '<div class="loading">Loading mesoscale discussions (backup method)...</div>';
            
            const response = await fetch(`https://www.spc.noaa.gov/products/md/?${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch mesoscale discussions: ${response.status}`);
            }
            
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const mdLinks = tempDiv.querySelectorAll('a[href^="md"]');
            this.mesoDiscussions = [];
            
            if (mdLinks && mdLinks.length > 0) {
                const recentLinks = Array.from(mdLinks).slice(0, 5);
                
                for (const link of recentLinks) {
                    const href = link.getAttribute('href');
                    const mdMatch = href.match(/md(\d+)\.html/);
                    
                    if (mdMatch) {
                        const mdNumber = mdMatch[1];
                        try {
                            const mdResponse = await fetch(`https://www.spc.noaa.gov/products/md/${href}?${new Date().getTime()}`);
                            const mdText = await mdResponse.text();
                            const mdDiv = document.createElement('div');
                            mdDiv.innerHTML = mdText;
                            
                            const preText = mdDiv.querySelector('pre')?.textContent || '';
                            
                            this.mesoDiscussions.push({
                                title: `MD #${mdNumber}`,
                                link: `https://www.spc.noaa.gov/products/md/${href}`,
                                description: preText,
                                mdNumber,
                                pubDate: new Date().toUTCString()
                            });
                        } catch (mdError) {
                            console.error('Error fetching individual MD:', mdError);
                        }
                    }
                }
            }
            
            if (this.mesoDiscussions.length === 0) {
                mesoFeed.innerHTML = '<div class="no-meso">No active mesoscale discussions found.</div>';
            } else {
                this.displayMesoscaleDiscussions();
            }
        } catch (error) {
            console.error('Error fetching mesoscale discussions:', error);
            mesoFeed.innerHTML = '<div class="error">Unable to load mesoscale discussions.</div>';
        }
    },

    /**
     * Display mesoscale discussions in the feed
     */
    displayMesoscaleDiscussions: function() {
        const mesoFeed = document.getElementById('meso-feed');
        if (!mesoFeed) return;
        
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
            
            // Use the stored mdNumber directly instead of trying to re-extract it
            const title = Utils.createElement('h3', {}, meso.title);
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
     * Add a function to trigger notifications
     */
    triggerNotification: function(title, message, type) {
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

        // Play sound
        const audio = new Audio('assets/notification.mp3');
        audio.play();

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
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