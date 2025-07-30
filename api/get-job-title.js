const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'http://localhost:3000',
  'http://localhost:8000'
];

const CACHE_DURATION = 300; // 5 minutes
const cache = new Map();

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (process.env.NODE_ENV === 'development' || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

function validateJobPostingId(jobPostingId) {
  if (!jobPostingId || typeof jobPostingId !== 'string') {
    return false;
  }
  
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(jobPostingId);
}

function getCachedResult(jobId) {
  const cached = cache.get(jobId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
    return cached.data;
  }
  return null;
}

function setCachedResult(jobId, data) {
  cache.set(jobId, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  try {
    const { jobPostingId } = req.body;
    
    if (!validateJobPostingId(jobPostingId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or missing jobPostingId. Must be a valid UUID.' 
      });
    }
    
    // Check cache first
    const cachedResult = getCachedResult(jobPostingId);
    if (cachedResult) {
      return res.status(200).json({
        ...cachedResult,
        cached: true
      });
    }

    const apiKey = process.env.ASHBY_API_KEY;
    if (!apiKey) {
      console.error('❌ ASHBY_API_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch('https://api.ashbyhq.com/jobPosting.info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        'User-Agent': 'Cursor-JobSite/1.0'
      },
      body: JSON.stringify({ jobPostingId }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ashby API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Ashby API returned ${response.status}: ${response.statusText}`);
    }

    const ashbyData = await response.json();

    if (!ashbyData.success || !ashbyData.results) {
      console.error('❌ Invalid Ashby API response:', ashbyData);
      throw new Error('Invalid response from Ashby API');
    }

    const result = {
      success: true,
      title: ashbyData.results.title || 'Position Title',
      department: ashbyData.results.departmentName || 'Department',
      location: ashbyData.results.locationName || 'Location',
      cached: false
    };
    
    // Cache the successful result
    setCachedResult(jobPostingId, result);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error fetching job title:', {
      message: error.message,
      stack: error.stack,
      jobPostingId: req.body?.jobPostingId
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout - please try again'
      });
    }
    
    if (error.message.includes('fetch')) {
      return res.status(503).json({
        success: false,
        error: 'External service unavailable - please try again later'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error - please try again later'
    });
  }
}
