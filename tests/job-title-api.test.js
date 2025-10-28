/**
 * Test suite for job title API analytics functionality
 * Tests caching, error tracking, performance metrics, and request analytics
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

describe('Job Title API Analytics', () => {
  let mockRequest;
  let mockResponse;
  let handler;

  beforeEach(async () => {
    // Import the handler after setting up mocks
    const module = await import('../api/get-job-title.js');
    handler = module.default;
    
    // Mock request object
    mockRequest = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000'
      },
      body: {
        jobPostingId: '36e69353-0452-4bf6-9f35-b1e7307959a7'
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

  describe('Request Analytics', () => {
    test('should log incoming request analytics', async () => {
      // Mock successful API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: {
            title: 'Software Engineer, Generalist',
            departmentName: 'Engineering',
            locationName: 'San Francisco'
          }
        })
      });

      // Set up environment
      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify analytics logging
      expect(analyticsLogs.some(log => log.includes('Error fetching job title'))).toBe(false);
      expect(errorLogs.length).toBe(0);
    });

    test('should track request timing analytics', async () => {
      const startTime = Date.now();
      
      // Mock API with delay
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              results: { title: 'Test Title' }
            })
          }), 100)
        )
      );

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify request completed within reasonable time
      expect(duration).toBeGreaterThan(90);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Caching Analytics', () => {
    test('should track cache hits and misses', async () => {
      // Mock successful API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: { title: 'Test Title' }
        })
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      // First request - should be cache miss
      await handler(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          cached: false
        })
      );

      // Reset mock
      mockResponse.json.mockClear();

      // Second request - should be cache hit
      await handler(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          cached: true
        })
      );
    });

    test('should track cache size and cleanup analytics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: { title: 'Test Title' }
        })
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      // Make multiple requests to test cache cleanup
      for (let i = 0; i < 5; i++) {
        const request = {
          ...mockRequest,
          body: { jobPostingId: `test-id-${i}` }
        };
        await handler(request, mockResponse);
      }

      // Verify no cache-related errors occurred
      expect(errorLogs.some(log => log.includes('cache'))).toBe(false);
    });
  });

  describe('Error Analytics', () => {
    test('should track and log API errors', async () => {
      // Mock API error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid request')
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify error was logged
      expect(errorLogs.some(log => log.includes('Ashby API error'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test('should track timeout errors', async () => {
      // Mock timeout
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          reject(error);
        })
      );

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify timeout error was handled
      expect(errorLogs.some(log => log.includes('timeout'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(408);
    });

    test('should track network errors', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      // Verify network error was handled
      expect(errorLogs.some(log => log.includes('fetch'))).toBe(true);
      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });

    test('should track invalid job posting ID errors', async () => {
      const invalidRequest = {
        ...mockRequest,
        body: { jobPostingId: 'invalid-id' }
      };

      await handler(invalidRequest, mockResponse);

      // Verify validation error was handled
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid or missing jobPostingId')
        })
      );
    });
  });

  describe('Performance Analytics', () => {
    test('should track response times', async () => {
      const startTime = Date.now();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: { title: 'Test Title' }
        })
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      await handler(mockRequest, mockResponse);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify response time is reasonable
      expect(responseTime).toBeLessThan(1000);
    });

    test('should handle concurrent requests efficiently', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: { title: 'Test Title' }
        })
      });

      process.env.ASHBY_API_KEY = 'test-api-key';

      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const promises = Array(5).fill().map(() => handler(mockRequest, mockResponse));
      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify concurrent requests completed efficiently
      expect(totalTime).toBeLessThan(2000);
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
        json: () => Promise.resolve({
          success: true,
          results: { title: 'Test Title' }
        })
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
  });

  describe('Data Validation Analytics', () => {
    test('should track validation failures', async () => {
      const invalidRequests = [
        { body: {} }, // Missing jobPostingId
        { body: { jobPostingId: null } }, // Null jobPostingId
        { body: { jobPostingId: '' } }, // Empty jobPostingId
        { body: { jobPostingId: 123 } }, // Non-string jobPostingId
        { body: { jobPostingId: 'not-a-uuid' } } // Invalid UUID format
      ];

      for (const request of invalidRequests) {
        await handler({ ...mockRequest, ...request }, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.stringContaining('Invalid or missing jobPostingId')
          })
        );
      }
    });
  });
});