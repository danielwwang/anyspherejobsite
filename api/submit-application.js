export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobPostingId, name, email, resume, linkedin, github, projectNote } = req.body;

    // Create form data for Ashby API
    const formData = new FormData();
    formData.append('jobPostingId', jobPostingId);
    formData.append('applicationForm', JSON.stringify({
      "fieldSubmissions": [
        {"path": "_systemfield_name", "value": name},
        {"path": "_systemfield_email", "value": email},
        {"path": "_systemfield_resume", "value": "resume_file"},
        {"path": "_systemfield_linkedin", "value": linkedin},
        {"path": "_systemfield_github", "value": github},
        {"path": "_systemfield_cover_letter", "value": projectNote}
      ]
    }));
    
    // Add resume file if provided
    if (resume) {
      formData.append('resume_file', resume);
    }

    // Submit to Ashby API
    const apiKey = process.env.ASHBY_API_KEY;
    if (!apiKey) {
      throw new Error('ASHBY_API_KEY environment variable not set');
    }

    const response = await fetch('https://api.ashbyhq.com/applicationForm.submit', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
      },
      body: formData
    });

    const responseText = await response.text();
    
    if (response.ok) {
      res.status(200).json({ success: true, message: 'Application submitted successfully!' });
    } else {
      console.error('Ashby API error:', response.status, responseText);
      res.status(400).json({ 
        success: false, 
        error: 'Failed to submit application',
        details: responseText,
        status: response.status
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
} 