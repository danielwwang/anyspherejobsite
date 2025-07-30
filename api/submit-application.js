// Polyfill for File/Blob in Node.js environment
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name;
      this.type = options.type || '';
      this.size = bits.reduce((acc, bit) => acc + bit.length, 0);
      this._bits = bits;
    }
    
    stream() {
      return new ReadableStream({
        start(controller) {
          this._bits.forEach(bit => controller.enqueue(bit));
          controller.close();
        }
      });
    }
    
    arrayBuffer() {
      return Promise.resolve(Buffer.concat(this._bits).buffer);
    }
  };
}

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

    // Log incoming request data
    console.log('📩 Received application data:', {
      jobPostingId,
      name,
      email,
      linkedin,
      github,
      hasResume: !!resume,
      projectNoteLength: projectNote?.length
    });

    // Create form data for Ashby API
    const formData = new FormData();
    formData.append('jobPostingId', jobPostingId);
    formData.append('applicationForm', JSON.stringify({
      "fieldSubmissions": [
        {"path": "_systemfield_name", "value": name},
        {"path": "_systemfield_email", "value": email},
        {"path": "_systemfield_resume", "value": "resume_file"}, // Resume file reference
        {"path": "6dd7d493-5687-4ffd-b7f3-ee9fd8f87b04", "value": linkedin}, // LinkedIn URL field
        {"path": "78a43fa2-1534-419f-a45c-61b72c904059", "value": github}, // GitHub Profile field
        {"path": "20c3128e-1abb-4d7c-bbad-62932b8e2600", "value": projectNote} // Project note field
      ]
    }));

    // Add resume file if provided
    if (resume && resume.data) {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(resume.data, 'base64');
        
        // Append the file buffer directly to form data
        formData.append('resume_file', buffer, {
          filename: resume.name || 'resume.pdf',
          contentType: resume.type || 'application/pdf'
        });
        console.log('📎 Resume file added:', resume.name, resume.type, buffer.length + ' bytes');
      } catch (fileError) {
        console.error('❌ Error processing resume file:', fileError);
        throw new Error('Failed to process resume file');
      }
    } else {
      console.log('⚠️ No resume file provided');
    }

    console.log('🚀 Submitting to Ashby API...');
    console.log('📝 Form data being sent:', {
      jobPostingId,
      fieldSubmissions: JSON.parse(formData.get('applicationForm')).fieldSubmissions
    });

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

    // Log detailed information
    console.log('Ashby API Response Status:', response.status);
    console.log('Ashby API Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Ashby API Response Body:', responseText);

    // Parse Ashby response
    let ashbyResponse;
    try {
      ashbyResponse = JSON.parse(responseText);
    } catch (e) {
      ashbyResponse = { success: false, error: 'Invalid JSON response' };
    }

    // Check both HTTP status AND Ashby's success field
    if (response.ok && ashbyResponse.success) {
      console.log('✅ Application submitted successfully to Ashby');
      res.status(200).json({ success: true, message: 'Application submitted successfully!' });
    } else {
      console.error('❌ Ashby API error:', response.status, ashbyResponse);
      res.status(400).json({
        success: false,
        error: ashbyResponse.errors ? ashbyResponse.errors.join(', ') : 'Failed to submit application',
        details: responseText,
        status: response.status,
        ashbyError: ashbyResponse.errorInfo?.code,
        ashbyResponse: responseText
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