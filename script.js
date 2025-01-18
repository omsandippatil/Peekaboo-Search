// API handling object
const API = {
    async checkConnection() {
        try {
            await fetch('https://www.google.com', { mode: 'no-cors' });
            return true;
        } catch {
            return false;
        }
    },

    async searchTavily(query) {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: CONFIG.TAVILY_API_KEY,
                query: query,
                max_results: 10,
                search_depth: "news"
            })
        });
        return response.ok ? response.json() : null;
    },

    async searchImages(query) {
        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${query}&searchType=image&num=8`
        );
        return response.ok ? response.json() : null;
    },

    async getGroqSummary(query, context) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    { role: "system", content: context },
                    { role: "user", content: query }
                ],
                temperature: 0.7,
                max_tokens: 3000,
            })
        });
        return response.json();
    }
};

// Component-specific functions
const Components = {
    async fetchGoogleResults(query) {
        const container = document.getElementById('googleResults');
        container.innerHTML = '<h3>Google Analysis</h3><p>Loading...</p>';
    
        try {
            // Step 1: Scrape data using ScraperAPI
            const scrapeResponse = await fetch(
                `https://api.scraperapi.com?api_key=${CONFIG.gSCRAPER_API_KEY}&url=https://www.google.com/search?q=${encodeURIComponent(query)}`
            );
    
            if (!scrapeResponse.ok) {
                throw new Error('Failed to scrape data from Google');
            }
    
            const scrapedData = await scrapeResponse.text();
    
            // Step 2: Parse the scraped data
            const parser = new DOMParser();
            const doc = parser.parseFromString(scrapedData, 'text/html');
            const results = Array.from(doc.querySelectorAll('.tF2Cxc')).map(result => ({
                title: result.querySelector('.DKV0Md')?.textContent || "No title available",
                snippet: result.querySelector('.aCOpRe')?.textContent || "No snippet available",
                link: result.querySelector('a')?.href || "No link available",
            }));
    
            if (results.length === 0) {
                throw new Error('No valid results found from the scraped data.');
            }
    
            // Step 3: Prepare a prompt for Groq API
            const context = `
                Provide a marketing-focused summary based on the following search results:
                - Analyze competitors mentioned and provide an overview of their strengths and weaknesses.
                - Suggest marketing strategies and advertisement ideas based on the data.
                - Include dummy estimates for competitor advertisement budgets, campaign performance, and market share where direct data is unavailable.
                - Structure the summary hierarchically in a bit-wise format for easier readability and insights:
                    - Competitor Data
                        - Competitor Name
                        - Ad Spend (if available, otherwise estimate)
                        - Market Position
                    - Marketing Opportunities
                        - Strengths to Leverage
                        - Weaknesses to Exploit
                        - Advertisement Recommendations
            `;
    
            // Step 4: Summarize data using Groq API
            const summaryResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.gGROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: JSON.stringify(results) },
                    ],
                    temperature: 0.7,
                    max_tokens: 3000,
                }),
            });
    
            if (!summaryResponse.ok) {
                throw new Error('Failed to summarize data using Groq API.');
            }
    
            const summaryData = await summaryResponse.json();
            const summary = summaryData.choices?.[0]?.message?.content || "No summary data available.";
    
            // Step 5: Use component to display data
            this.displayGoogleResults(results, summary);
        } catch (error) {
            console.error("Error in fetchGoogleResults:", error);
    
            container.innerHTML = `
                <h3>Google Analysis</h3>
                <p class="error">Error: ${error.message}</p>
            `;
        }
    },
    
    // Updated display component for structured data
    displayGoogleResults(results, summary) {
        const container = document.getElementById('googleResults');
    
        // Ensure everything is structured and stays inside the container
        container.innerHTML = `
            <div>
                <h3>Google Analysis Summary</h3>
                <pre>${summary}</pre>
            </div>
            <div>
                <h4>Search Results</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Snippet</th>
                            <th>Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => `
                            <tr>
                                <td>${result.title}</td>
                                <td>${result.snippet}</td>
                                <td><a href="${result.link}" target="_blank">Visit</a></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },    
    

    
    async fetchRedditInsights(query) {
        const container = document.getElementById('redditResults');
        container.innerHTML = '<h3>Reddit Insights</h3><p>Reddit discussion analysis would appear here...</p>';
    },

    async fetchYouTubeAnalysis(query) {
        const container = document.getElementById('youtubeAnalysis');
        container.innerHTML = '<h3>YouTube Analysis</h3><p>YouTube content analysis would appear here...</p>';
    },

    async generateTrendGraph(query) {
        const container = document.getElementById('trendGraph');
        container.innerHTML = '<h3>Trend Analysis</h3><p>Trend visualization would appear here...</p>';
    },

    async analyzeSentiment(query) {
        const container = document.getElementById('sentimentAnalysis');
        container.innerHTML = '<h3>Sentiment Analysis</h3><p>Sentiment analysis results would appear here...</p>';
    },

    async updateMediaGallery(query) {
        const container = document.getElementById('mediaGallery');
        container.innerHTML = `
            <h3>Media Gallery</h3>
            <div class="videos-container"><p>Video content would appear here...</p></div>
            <div class="images-gallery"><p>Additional images would appear here...</p></div>
        `;
    }
};

// Display functions
function displayImages(images) {
    const container = document.getElementById("imagesContainer");
    container.innerHTML = '<h3>Image Results</h3><div class="images-scroll">' + 
        images.map(image => `
            <div class="image-item">
                <img src="${image.link}" alt="Search Result Image" onerror="this.src='placeholder.jpg'">
            </div>
        `).join('') + '</div>';
}

function displayNews(results) {
    const container = document.getElementById("newsResults");
    container.innerHTML = '<h3>News Results</h3>' + results.map(result => `
        <div class="news-result">
            <h4><a href="${result.url}" target="_blank">${result.title}</a></h4>
            <p>${result.snippet || result.content}</p>
        </div>
    `).join('');
}

function displayError(error) {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = `<p class="error">Error: ${error.message}</p>`;
}

// Search handling functions
async function handleImageSearch(query) {
    const container = document.getElementById("imagesContainer");
    try {
        const data = await API.searchImages(query);
        if (data && data.items) {
            displayImages(data.items);
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load images</p>';
    }
}

async function handleNewsSearch(query) {
    const container = document.getElementById("newsResults");
    try {
        const data = await API.searchTavily(query + " News");
        if (data && data.results) {
            displayNews(data.results);
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load news</p>';
    }
}

async function generateSummary(query) {
    const container = document.getElementById("summary");
    try {
        const context = "Provide a comprehensive summary of the search results...";
        const summary = await API.getGroqSummary(query, context);
        if (summary.choices && summary.choices[0]) {
            container.innerHTML = `<h3>Summary</h3><p>${summary.choices[0].message.content}</p>`;
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to generate summary</p>';
    }
}

async function handleSearch(e) {
    e.preventDefault();
    const query = document.getElementById("searchInput").value;
    const showImages = document.getElementById("showImagesCheckbox").checked;

    try {
        const isOnline = await API.checkConnection();
        if (!isOnline) throw new Error('No internet connection');

        // Execute all component updates concurrently
        await Promise.all([
            Components.fetchGoogleResults(query),
            Components.fetchRedditInsights(query),
            Components.fetchYouTubeAnalysis(query),
            Components.generateTrendGraph(query),
            Components.analyzeSentiment(query),
            Components.updateMediaGallery(query),
            showImages && handleImageSearch(query),
            handleNewsSearch(query)
        ]);

        // Generate summary after all data is collected
        await generateSummary(query);

    } catch (error) {
        displayError(error);
    }
}

// Setup UI
function setupUI() {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");

    document.querySelectorAll('.question').forEach(q => {
        q.addEventListener('click', () => searchInput.value = q.textContent);
    });

    searchForm.addEventListener("submit", handleSearch);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", setupUI);