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
        container.innerHTML = '<h3>Reddit Insights</h3><p>Loading...</p>';
    
        try {
            // Prepare the context for Groq to generate Reddit-style analysis
            const context = `
                You are an expert at analyzing Reddit discussions. For the given query, generate a comprehensive analysis that includes:
                
                1. First, create 4-5 example Reddit posts/comments that would be typical for this topic, including:
                   - Post titles with realistic engagement numbers (upvotes, comments)
                   - Top comments and responses
                   - Subreddit names where these discussions would occur
                
                2. Then provide a detailed analysis including:
                   - Key discussion trends across Reddit communities
                   - Common user sentiments and opinions
                   - Product/service opportunities mentioned in discussions
                   - Challenges or complaints frequently raised
                   - Notable debates or controversies
                   - Popular feature requests or suggestions
                
                Structure the analysis with clear sections and bullet points.
                Make the Reddit examples feel authentic by including typical Reddit language, awards, and interaction patterns.
                
                Format everything in HTML with appropriate classes for styling.
            `;
    
            // Get analysis from Groq API
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.rGROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: `Analyze Reddit discussions about: ${query}` }
                    ],
                    temperature: 0.7,
                    max_tokens: 3000,
                })
            });
    
            if (!response.ok) {
                throw new Error('Failed to get Reddit insights from Groq API');
            }
    
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content || "No Reddit insights available.";
    
            // Display the formatted analysis
            container.innerHTML = `
                <div class="reddit-insights">
                    <h3>Reddit Community Insights</h3>
                    <div class="reddit-content">
                        ${analysis}
                    </div>
                    <div class="note">
                        <small>* Analysis generated based on typical Reddit discussions</small>
                    </div>
                </div>
            `;
    
        } catch (error) {
            console.error("Error in fetchRedditInsights:", error);
            container.innerHTML = `
                <h3>Reddit Insights</h3>
                <p class="error">Error fetching Reddit insights: ${error.message}</p>
            `;
        }
    },

    async generateTrendGraph(query) {
        const container = document.getElementById('trendGraph');
        if (!container) {
            console.error('Trend graph container not found');
            return;
        }
    
        container.innerHTML = '<h3>Market Analysis</h3><div class="loading">Loading visualizations...</div>';
    
        try {
            // Ensure Chart.js is loaded
            if (typeof Chart === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Chart.js'));
                    document.head.appendChild(script);
                });
            }
    
            // Get analysis data from Groq
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.pGROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        {
                            role: "system",
                            content: `Generate comprehensive market analysis data for visualization. Include:
                                1. Historic trend data
                                2. Market share distribution
                                3. User sentiment distribution
                                4. Regional distribution
                                5. Age group distribution
                                6. Price point distribution
                                
                                Format response as JSON with:
                                {
                                    "historicTrend": {
                                        "title": "string",
                                        "labels": ["month1",...],
                                        "datasets": [
                                            {
                                                "label": "string",
                                                "data": [number,...]
                                            }
                                        ]
                                    },
                                    "marketShare": {
                                        "title": "string",
                                        "labels": ["company1",...],
                                        "data": [number,...]
                                    },
                                    "sentiment": {
                                        "title": "string",
                                        "labels": ["Positive", "Neutral", "Negative"],
                                        "data": [number,...]
                                    },
                                    "regional": {
                                        "title": "string",
                                        "labels": ["region1",...],
                                        "data": [number,...]
                                    },
                                    "demographics": {
                                        "title": "string",
                                        "labels": ["age1",...],
                                        "data": [number,...]
                                    },
                                    "priceDistribution": {
                                        "title": "string",
                                        "labels": ["range1",...],
                                        "data": [number,...]
                                    }
                                }`
                        },
                        {
                            role: "user",
                            content: `Generate market analysis visualization data for: ${query}`
                        }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });
    
            if (!response.ok) throw new Error('Failed to get analysis data');
    
            const groqResponse = await response.json();
            const data = JSON.parse(groqResponse.choices[0].message.content);
    
            // Prepare container for all charts with modified layout
            container.innerHTML = `
                <h3>Market Analysis Dashboard</h3>
                <div class="charts-grid">
                    <div class="chart-container large">
                        <canvas id="historicTrendChart"></canvas>
                    </div>
                    <div class="pie-charts-row">
                        <div class="chart-container small">
                            <canvas id="marketShareChart"></canvas>
                        </div>
                        <div class="chart-container small">
                            <canvas id="sentimentChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="regionalChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="demographicsChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="priceChart"></canvas>
                    </div>
                </div>
            `;
    
            // Add CSS for the new layout
            const style = document.createElement('style');
            style.textContent = `
                .charts-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .chart-container.large {
                    width: 100%;
                    height: 400px;
                }
                .pie-charts-row {
                    display: flex;
                    gap: 20px;
                    justify-content: space-between;
                }
                .chart-container.small {
                    width: 48%;
                    height: 250px;
                }
            `;
            document.head.appendChild(style);
    
            // Common chart colors (orange shades)
            const colors = {
                line: 'rgb(255, 159, 64)',
                pie: [
                    'rgb(255, 159, 64)',  // orange
                    'rgb(255, 127, 80)',  // coral
                    'rgb(255, 140, 0)',   // dark orange
                    'rgb(255, 165, 0)',   // orange
                    'rgb(255, 179, 71)',  // mellow orange
                    'rgb(255, 197, 92)'   // light orange
                ],
                bar: 'rgb(255, 159, 64)'
            };
    
            // Create Historic Trend Line Chart
            new Chart('historicTrendChart', {
                type: 'line',
                data: {
                    labels: data.historicTrend.labels,
                    datasets: data.historicTrend.datasets.map(dataset => ({
                        ...dataset,
                        borderColor: colors.line,
                        tension: 0.1
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: data.historicTrend.title } }
                }
            });
    
            // Create Market Share Pie Chart
            new Chart('marketShareChart', {
                type: 'pie',
                data: {
                    labels: data.marketShare.labels,
                    datasets: [{
                        data: data.marketShare.data,
                        backgroundColor: colors.pie
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        title: { display: true, text: data.marketShare.title },
                        legend: { position: 'right', labels: { fontSize: 10 } }
                    }
                }
            });
    
            // Create Sentiment Doughnut Chart
            new Chart('sentimentChart', {
                type: 'doughnut',
                data: {
                    labels: data.sentiment.labels,
                    datasets: [{
                        data: data.sentiment.data,
                        backgroundColor: colors.pie.slice(0, 3)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        title: { display: true, text: data.sentiment.title },
                        legend: { position: 'right', labels: { fontSize: 10 } }
                    }
                }
            });
    
            // Create Regional Bar Chart
            new Chart('regionalChart', {
                type: 'bar',
                data: {
                    labels: data.regional.labels,
                    datasets: [{
                        label: 'Regional Distribution',
                        data: data.regional.data,
                        backgroundColor: colors.bar
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: data.regional.title } }
                }
            });
    
            // Create Demographics Bar Chart
            new Chart('demographicsChart', {
                type: 'bar',
                data: {
                    labels: data.demographics.labels,
                    datasets: [{
                        label: 'Age Distribution',
                        data: data.demographics.data,
                        backgroundColor: colors.bar
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: data.demographics.title } }
                }
            });
    
            // Create Price Distribution Bar Chart
            new Chart('priceChart', {
                type: 'bar',
                data: {
                    labels: data.priceDistribution.labels,
                    datasets: [{
                        label: 'Price Distribution',
                        data: data.priceDistribution.data,
                        backgroundColor: colors.bar
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: data.priceDistribution.title } }
                }
            });
    
        } catch (error) {
            console.error('Error in generateTrendGraph:', error);
            container.innerHTML = `
                <h3>Market Analysis</h3>
                <div class="error">
                    <p>Error generating visualizations: ${error.message}</p>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    },

    async fetchYouTubeAnalysis(query) {
        const container = document.getElementById('youtubeAnalysis');
        container.innerHTML = '<h3>YouTube Analysis</h3><p>YouTube content analysis would appear here...</p>';
    },


    async analyzeSentiment(query) {
        const container = document.getElementById('sentimentAnalysis');
        container.innerHTML = '<h3>Sentiment Analysis</h3><p>Loading sentiment analysis...</p>';
    
        try {
            // Prepare the context for sentiment analysis
            const context = `
                Analyze the public sentiment and market insights for the given product/topic. 
                Structure your response as follows:
                1. Overall Sentiment: Provide a clear positive/negative/neutral rating with percentage
                2. Key Sentiment Drivers: List main factors affecting public opinion
                3. Market Positioning: Analyze where this fits in the market
                4. Consumer Perception: Detail how consumers view this product/topic
                5. Recommendations: Suggest improvements based on sentiment
                
                Format the response in a clean, HTML-friendly structure with appropriate headings and sections.
                Include specific percentages and metrics where relevant.
            `;
    
            // Get sentiment analysis from Groq API
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.sGROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: `Analyze public sentiment and market insights for: ${query}` }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                })
            });
    
            if (!response.ok) {
                throw new Error('Failed to get sentiment analysis from Groq API');
            }
    
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content || "No sentiment analysis available.";
    
            // Display the formatted analysis
            container.innerHTML = `
                <div class="sentiment-analysis">
                    <h3>Sentiment Analysis</h3>
                    <div class="analysis-content">
                        ${analysis}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error("Error in analyzeSentiment:", error);
            container.innerHTML = `
                <h3>Sentiment Analysis</h3>
                <p class="error">Error analyzing sentiment: ${error.message}</p>
            `;
        }
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