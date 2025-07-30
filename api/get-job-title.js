export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobPostingId } = req.body;
    
    if (!jobPostingId) {
      return res.status(400).json({ error: 'jobPostingId is required' });
    }

    const apiKey = process.env.ASHBY_API_KEY;
    if (!apiKey) {
      throw new Error('ASHBY_API_KEY environment variable not set');
    }

    const response = await fetch('https://api.ashbyhq.com/jobPosting.info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
      },
      body: JSON.stringify({ jobPostingId })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch job from Ashby');
    }

    const ashbyData = await response.json();

    if (!ashbyData.success || !ashbyData.results) {
      throw new Error('Invalid response from Ashby API');
    }

    res.status(200).json({
      success: true,
      title: ashbyData.results.title,
      department: ashbyData.results.departmentName,
      location: ashbyData.results.locationName
    });

  } catch (error) {
    console.error('❌ Error fetching job title:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job title'
    });
  }
}
