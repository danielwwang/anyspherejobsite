// Polyfill File for Node.js if not available
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.type = options.type || 'application/octet-stream';
      this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
      this._chunks = chunks;
    }
    
    stream() {
      const { Readable } = require('stream');
      return Readable.from(Buffer.concat(this._chunks));
    }
    
    arrayBuffer() {
      return Promise.resolve(Buffer.concat(this._chunks).buffer);
    }
  };
}

const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'http://localhost:3000',
  'http://localhost:8000'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

function validateApplicationData(data) {
  const errors = [];
  
  if (!data.jobPostingId || typeof data.jobPostingId !== 'string') {
    errors.push('Invalid job posting ID');
  }
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (data.linkedin && !data.linkedin.includes('linkedin.com')) {
    errors.push('LinkedIn URL must be a valid LinkedIn profile');
  }
  
  if (data.github && !data.github.includes('github.com')) {
    errors.push('GitHub URL must be a valid GitHub profile');
  }
  
  if (!data.projectNote || data.projectNote.trim().length < 10) {
    errors.push('Project note must be at least 10 characters');
  }
  
  return errors;
}

function validateResumeFile(resume) {
  const errors = [];
  
  if (!resume || !resume.data) {
    errors.push('Resume file is required');
  } else {
    const buffer = Buffer.from(resume.data, 'base64');
    
    if (buffer.length > MAX_FILE_SIZE) {
      errors.push(`Resume file must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    if (!ALLOWED_FILE_TYPES.includes(resume.type)) {
      errors.push('Resume must be a PDF or Word document');
    }
  }
  
  return errors;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  // Handle preflight requests
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
    const { jobPostingId, name, email, resume, linkedin, github, projectNote } = req.body;

    // Validate application data
    const validationErrors = validateApplicationData(req.body);
    const resumeErrors = validateResumeFile(resume);
    const allErrors = [...validationErrors, ...resumeErrors];
    
    if (allErrors.length > 0) {
      console.error('❌ Validation errors:', allErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: allErrors
      });
    }

    // Log incoming request data (sanitized)
    console.log('📩 Received application data:', {
      jobPostingId,
      name: name.substring(0, 20) + '...',
      email: email.replace(/(.{2}).*@/, '$1***@'),
      hasLinkedIn: !!linkedin,
      hasGitHub: !!github,
      hasResume: !!resume,
      projectNoteLength: projectNote?.length
    });

    // Create form data for Ashby API
    const formData = new FormData();
    formData.append('jobPostingId', jobPostingId);
    
    // Build field submissions dynamically
    const fieldSubmissions = [
      {"path": "_systemfield_name", "value": name},
      {"path": "_systemfield_email", "value": email},
      {"path": "_systemfield_resume", "value": "resume_file"}, // Resume file reference
      {"path": "6dd7d493-5687-4ffd-b7f3-ee9fd8f87b04", "value": linkedin}, // LinkedIn URL field
      {"path": "20c3128e-1abb-4d7c-bbad-62932b8e2600", "value": projectNote} // Project note field
    ];
    
    // Only include GitHub field if it's provided (for non-GTM jobs)
    if (github && github.trim() !== '') {
      fieldSubmissions.push({"path": "78a43fa2-1534-419f-a45c-61b72c904059", "value": github}); // GitHub Profile field
    }
    
    formData.append('applicationForm', JSON.stringify({
      "fieldSubmissions": fieldSubmissions
    }));

    // Add resume file if provided
    if (resume && resume.data) {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(resume.data, 'base64');
        
        // Validate file size and type again (defense in depth)
        if (buffer.length > MAX_FILE_SIZE) {
          throw new Error(`File too large: ${buffer.length} bytes`);
        }
        
        if (!ALLOWED_FILE_TYPES.includes(resume.type)) {
          throw new Error(`Invalid file type: ${resume.type}`);
        }
        
        // Create a proper File object with sanitized filename
        const sanitizedName = (resume.name || 'resume.pdf')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 100);
        
        const file = new File([buffer], sanitizedName, {
          type: resume.type
        });
        
        // Append the file to form data
        formData.append('resume_file', file);
        console.log('📎 Resume file processed:', {
          originalName: resume.name,
          sanitizedName,
          type: resume.type,
          size: buffer.length
        });
      } catch (fileError) {
        console.error('❌ Error processing resume file:', fileError);
        return res.status(400).json({
          success: false,
          error: 'Resume file processing failed',
          details: fileError.message
        });
      }
    }

    console.log('🚀 Submitting to Ashby API...');
    console.log('📝 Form data being sent:', {
      jobPostingId,
      fieldSubmissions: JSON.parse(formData.get('applicationForm')).fieldSubmissions
    });

    const apiKey = process.env.ASHBY_API_KEY;
    if (!apiKey) {
      console.error('❌ ASHBY_API_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for file upload
    
    const response = await fetch('https://api.ashbyhq.com/applicationForm.submit', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        'User-Agent': 'Cursor-JobSite/1.0'
      },
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

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
    console.error('Server error:', {
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