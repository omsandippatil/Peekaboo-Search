// Load environment variables
require('dotenv').config();

// Check internet connection
function checkInternetConnection() {
    return fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' })
        .then(() => true)
        .catch(() => false);
}

// Wrapper for fetch with timeout
function fetchWithTimeout(url, options, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
}

document.getElementById('searchForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    results.innerHTML = 'Processing query...';
    summary.textContent = '';

    try {
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
            throw new Error('No internet connection');
        }

        // Use Serper for latest web search
        async function searchWithSerper(query, numSources = 15) {
            console.log('Starting Serper search with query:', query);
            try {
                const response = await fetchWithTimeout(`https://api.serper.dev/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.SERPER_API_KEY}`
                    },
                    body: JSON.stringify({
                        q: query,
                        num: numSources,
                        tbs: 'qdr:d'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Serper API request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Serper data:', data);

                if (data.organic && data.organic.length > 0) {
                    return data.organic.map(item => ({
                        url: item.link,
                        snippet: item.snippet || '',
                        title: item.title || '',
                        date: item.date || 'Recent'
                    }));
                }
                throw new Error('No organic results found in Serper response');
            } catch (error) {
                console.error('Error in searchWithSerper:', error);
                throw error;
            }
        }

        // Use Google for latest image search
        async function searchImagesWithGoogle(query, numImages = 4) {
            console.log('Starting Google Image search with query:', query);
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image&sort=date`;
                const response = await fetchWithTimeout(url);

                if (!response.ok) {
                    throw new Error(`Google Image Search API request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Google Image data:', data);

                if (data.items && data.items.length > 0) {
                    return data.items.map(item => ({
                        url: item.link,
                        title: item.title || '',
                        date: item.image.contextLink || 'Recent'
                    }));
                }
                throw new Error('No image results found in Google response');
            } catch (error) {
                console.error('Error in searchImagesWithGoogle:', error);
                throw error;
            }
        }

        // Perform the searches
        const [textResults, imageResults] = await Promise.all([
            searchWithSerper(query).catch(error => {
                console.error('Serper search failed:', error);
                return [];
            }),
            searchImagesWithGoogle(query).catch(error => {
                console.error('Google Image search failed:', error);
                return [];
            })
        ]);

        if (textResults.length === 0 && imageResults.length === 0) {
            throw new Error('Both text and image searches failed to return results');
        }

        const context = prepareContext(textResults, imageResults);

        // Send data to Groq for summarization
        console.log('Sending data to Groq for summarization:', context);
        const groqResponse = await fetchWithTimeout('https://api.groq.dev/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama2-70b',
                prompt: `Summarize the following information, focusing on the most recent and relevant details. Highlight any notable recent developments or changes:\n\n${context}`
            })
        });

        if (!groqResponse.ok) {
            throw new Error(`Groq API request failed: ${groqResponse.status} ${groqResponse.statusText}`);
        }

        const summaryData = await groqResponse.json();
        console.log('Groq summary data:', summaryData);

        if (!summaryData.summary) {
            throw new Error('No summary provided in Groq response');
        }

        typeWriter(summaryData.summary, summary);
        displayResults(textResults, imageResults, results);

    } catch (error) {
        console.error('Error in processing the query:', error);
        results.innerHTML = `Error processing query: ${error.message}. Please try again or contact support if the problem persists.`;
    }
});
 
function prepareContext(snippets, images) {
    let context = "Web Search Results:\n";
    snippets.forEach((s, index) => {
        context += `${index + 1}. ${s.title} (${s.date})\n${s.snippet}\n\n`;
    });
    
    context += "\nRecent Images:\n";
    images.forEach((img, index) => {
        context += `${index + 1}. ${img.title} (${img.date})\n`;
    });
    
    return context;
}

function typeWriter(text, element, index = 0) {
    if (index < text.length) {
        element.textContent += text.charAt(index);
        setTimeout(() => typeWriter(text, element, index + 1), 20);
    }
}

function displayResults(textResults, imageResults, container) {
    container.innerHTML = '';
    
    // Display text results
    if (textResults.length > 0) {
        const textResultsDiv = document.createElement('div');
        textResultsDiv.innerHTML = '<h3>Web Search Results:</h3>';
        textResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `
                <h4><a href="${result.url}" target="_blank">${result.title}</a></h4>
                <p>${result.snippet}</p>
                <small>Date: ${result.date}</small>
            `;
            textResultsDiv.appendChild(resultDiv);
        });
        container.appendChild(textResultsDiv);
    }

    async function fetchGoogleDataAndSummarize(query, targetComponentId) {
        const targetComponent = document.getElementById(targetComponentId);
    
        try {
            // Step 1: Fetch data from Google across multiple pages
            const googleResults = [];
            const maxPages = 3; // Number of pages to scrape
            const resultsPerPage = 10; // Number of results per page
            const apiKey = process.env.GOOGLE_API_KEY;
            const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
            for (let page = 1; page <= maxPages; page++) {
                const startIndex = (page - 1) * resultsPerPage + 1;
                const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&start=${startIndex}`;
                
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch Google data: ${response.statusText}`);
                
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    googleResults.push(...data.items.map(item => ({
                        title: item.title,
                        snippet: item.snippet || '',
                        link: item.link || '',
                    })));
                }
            }
    
            if (googleResults.length === 0) throw new Error('No data found from Google search.');
    
            // Step 2: Prepare context for Groq
            let context = "Google Search Results:\n\n";
            googleResults.forEach((result, index) => {
                context += `${index + 1}. ${result.title}\n${result.snippet}\nLink: ${result.link}\n\n`;
            });
    
            // Step 3: Send data to Groq for summarization
            const groqResponse = await fetch('https://api.groq.dev/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'llama2-70b',
                    prompt: `Summarize the following information:\n\n${context}`,
                }),
            });
    
            if (!groqResponse.ok) throw new Error(`Failed to get summary from Groq: ${groqResponse.statusText}`);
    
            const summaryData = await groqResponse.json();
            if (!summaryData.summary) throw new Error('No summary provided by Groq.');
    
            // Step 4: Display the summary in the target component
            targetComponent.innerHTML = `
                <h3>Summary</h3>
                <p>${summaryData.summary}</p>
            `;
        } catch (error) {
            console.error('Error fetching and summarizing data:', error);
            targetComponent.innerHTML = `
                <h3>Error</h3>
                <p>${error.message}</p>
            `;
        }
    }    
    // Display image results
    if (imageResults.length > 0) {
        const imageResultsDiv = document.createElement('div');
        imageResultsDiv.innerHTML = '<h3>Recent Images:</h3>';
        imageResultsDiv.style.display = 'flex';
        imageResultsDiv.style.flexWrap = 'wrap';
        imageResults.forEach(image => {
            const imgDiv = document.createElement('div');
            imgDiv.style.margin = '10px';
            imgDiv.innerHTML = `
                <img src="${image.url}" alt="${image.title}" style="max-width: 200px; max-height: 200px;">
                <p>${image.title}</p>
                <small>Date: ${image.date}</small>
            `;
            imageResultsDiv.appendChild(imgDiv);
        });
        container.appendChild(imageResultsDiv);
    }

    if (textResults.length === 0 && imageResults.length === 0) {
        container.innerHTML = 'No results found. Please try a different query.';
    }
}

