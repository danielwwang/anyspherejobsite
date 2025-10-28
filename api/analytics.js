const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'http://localhost:3000',
  'http://localhost:8000'
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === 'development' || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object') return {};

  const forbiddenSubstrings = ['email', 'name', 'linkedin', 'github', 'resume', 'file'];

  const sanitized = {};
  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenSubstrings.some(substr => lowerKey.includes(substr))) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  try {
    const { eventName, properties, url, title, referrer, deviceId, sessionId, ts } = req.body || {};

    if (!eventName || typeof eventName !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid or missing eventName' });
    }

    const safeProperties = sanitizeProperties(properties);

    // Minimal logging-based analytics for now
    console.log('📈 Analytics event:', {
      eventName,
      properties: safeProperties,
      url,
      title,
      referrer,
      deviceId,
      sessionId,
      ts: ts || Date.now()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Analytics error:', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
