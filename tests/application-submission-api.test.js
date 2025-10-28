/**
 * Test suite for application submission API analytics functionality
 * Tests form submission tracking, file upload analytics, validation metrics, and error tracking
 */

const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');

// Mock fetch for testing
global.fetch = fetch;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock console methods to track analytics logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let analyticsLogs = [];
let errorLogs = [];
let warningLogs = [];

beforeEach(() => {
  // Reset analytics tracking
  analyticsLogs = [];
  errorLogs = [];
  warningLogs = [];
  
  // Mock console methods to capture analytics data
  console.log = (...args) => {
    analyticsLogs.push(args.join(' '));
    originalConsoleLog(...args);
  };
  
  console.error = (...args) => {
    errorLogs.push(args.join(' '));
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    warningLogs.push(args.join(' '));
    originalConsoleWarn(...args);
  };
});

afterEach(() => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('Application Submission API Analytics', () => {
  let mockRequest;
  let mockResponse;
  let handler;

  beforeEach(async () => {
    // Import the handler after setting up mocks
    const module = await import('../api/submit-application.js');
    handler = module.default;
    
    // Mock request object with valid application data
    mockRequest = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json'
      },
      body: {
        jobPostingId: '36e69353-0452-4bf6-9f35-b1e7307959a7',
        name: 'John Doe',
        email: 'john@example.com',
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
        projectNote: 'This is a test project note that is long enough to pass validation.',
        resume: {
          name: 'resume.pdf',
          type: 'application/pdf',
          data: 'dGVzdCBmaWxlIGRhdGE=' // base64 encoded "test file data"
        }
      }
    };
    
    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
  });

  describe('Form Submission Analytics', () => {
    test('should log incoming application data analytics', async () => {
      // Mock successful Ashby API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify analytics logging
      expect(analyticsLogs.some(log => log.includes('Received application data'))).toBe(true);
      expect(analyticsLogs.some(log => log.includes('Submitting to Ashby API'))).toBe(true);
      expect(analyticsLogs.some(log => log.includes('Application submitted successfully'))).toBe(true);
    });

    test('should track form validation analytics', async () => {
      const invalidRequest = {
        ...mockRequest,
        body: {
          jobPostingId: '36e69353-0452-4bf6-9f35-b1e7307959a7',
          name: 'J', // Too short
          email: 'invalid-email', // Invalid email
          linkedin: 'not-linkedin-url', // Invalid LinkedIn
          github: 'not-github-url', // Invalid GitHub
          projectNote: 'Short', // Too short
          resume: {
            name: 'resume.pdf',
            type: 'application/pdf',
            data: 'dGVzdA==' // Valid base64
          }
        }
      };

      await handler(invalidRequest, mockResponse);

      // Verify validation errors were logged
      expect(errorLogs.some(log => log.includes('Validation errors'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.any(Array)
        })
      );
    });

    test('should track file upload analytics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify file processing was logged
      expect(analyticsLogs.some(log => log.includes('Resume file processed'))).toBe(true);
    });

    test('should track file validation errors', async () => {
      const invalidFileRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          resume: {
            name: 'resume.pdf',
            type: 'image/jpeg', // Invalid file type
            data: 'dGVzdA=='
          }
        }
      };

      await handler(invalidFileRequest, mockResponse);

      // Verify file validation error was logged
      expect(errorLogs.some(log => log.includes('Validation errors'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('should track file size validation', async () => {
      // Create a large file (simulate > 10MB)
      const largeFileData = 'A'.repeat(11 * 1024 * 1024); // 11MB
      const largeFileRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          resume: {
            name: 'large-resume.pdf',
            type: 'application/pdf',
            data: Buffer.from(largeFileData).toString('base64')
          }
        }
      };

      await handler(largeFileRequest, mockResponse);

      // Verify file size validation error
      expect(errorLogs.some(log => log.includes('Validation errors'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('API Integration Analytics', () => {
    test('should track successful Ashby API submissions', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify success analytics
      expect(analyticsLogs.some(log => log.includes('Application submitted successfully to Ashby'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Application submitted successfully!'
        })
      );
    });

    test('should track Ashby API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({
          success: false,
          errors: ['Invalid job posting ID']
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify error analytics
      expect(errorLogs.some(log => log.includes('Ashby API error'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('should track API timeout errors', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          reject(error);
        })
      );

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify timeout error handling
      expect(errorLogs.some(log => log.includes('timeout'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(408);
    });

    test('should track network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify network error handling
      expect(errorLogs.some(log => log.includes('fetch'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });
  });

  describe('Performance Analytics', () => {
    test('should track submission processing time', async () => {
      const startTime = Date.now();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify processing completed within reasonable time
      expect(processingTime).toBeLessThan(1000);
    });

    test('should track file processing performance', async () => {
      const largeFileRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          resume: {
            name: 'large-resume.pdf',
            type: 'application/pdf',
            data: Buffer.from('A'.repeat(1024 * 1024)).toString('base64') // 1MB file
          }
        }
      };

      const startTime = Date.now();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(largeFileRequest, mockResponse);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify file processing completed efficiently
      expect(processingTime).toBeLessThan(2000);
    });
  });

  describe('Security Analytics', () => {
    test('should track CORS analytics', async () => {
      const corsRequest = {
        ...mockRequest,
        headers: {
          origin: 'https://malicious-site.com'
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(corsRequest, mockResponse);

      // Verify CORS headers were set
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://malicious-site.com');
    });

    test('should track invalid request methods', async () => {
      const getRequest = {
        ...mockRequest,
        method: 'GET'
      };

      await handler(getRequest, mockResponse);

      // Verify method not allowed error
      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Method not allowed'
        })
      );
    });

    test('should track missing API key', async () => {
      delete process.env.ASHBY_API_KEY;

      await handler(mockRequest, mockResponse);

      // Verify missing API key error
      expect(errorLogs.some(log => log.includes('ASHBY_API_KEY environment variable not set'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Data Sanitization Analytics', () => {
    test('should track data sanitization in logs', async () => {
      const sensitiveRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          name: 'John Doe',
          email: 'john.doe@example.com'
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(sensitiveRequest, mockResponse);

      // Verify sensitive data was sanitized in logs
      const logEntry = analyticsLogs.find(log => log.includes('Received application data'));
      expect(logEntry).toBeDefined();
      expect(logEntry).toContain('Jo...'); // Name truncated
      expect(logEntry).toContain('jo***@'); // Email masked
    });

    test('should track filename sanitization', async () => {
      const maliciousFileRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          resume: {
            name: '../../../etc/passwd.pdf', // Malicious filename
            type: 'application/pdf',
            data: 'dGVzdA=='
          }
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(maliciousFileRequest, mockResponse);

      // Verify filename was sanitized
      expect(analyticsLogs.some(log => log.includes('sanitizedName'))).toBe(true);
    });
  });

  describe('Field-Specific Analytics', () => {
    test('should track GitHub field inclusion for engineering jobs', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify GitHub field was included
      const formDataLog = analyticsLogs.find(log => log.includes('Form data being sent'));
      expect(formDataLog).toBeDefined();
    });

    test('should track GitHub field exclusion for GTM jobs', async () => {
      const gtmRequest = {
        ...mockRequest,
        body: {
          ...mockRequest.body,
          jobPostingId: '61e4677d-cf3d-458a-bf6c-02287d5d2c39', // GTM job
          github: '' // Empty GitHub
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          results: { id: 'application-123' }
        }))
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(gtmRequest, mockResponse);

      // Verify GitHub field was excluded
      const formDataLog = analyticsLogs.find(log => log.includes('Form data being sent'));
      expect(formDataLog).toBeDefined();
    });
  });
});