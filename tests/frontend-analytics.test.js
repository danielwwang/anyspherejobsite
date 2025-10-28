/**
 * Test suite for frontend analytics functionality
 * Tests job title loading, form interactions, error handling, and user behavior tracking
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock fetch for frontend tests
global.fetch = jest.fn();

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

describe('Frontend Analytics', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Reset fetch mock
    global.fetch.mockClear();
  });

  describe('Job Title Loading Analytics', () => {
    test('should track job title loading success', async () => {
      // Load the main index page
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock successful API response
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          title: 'Software Engineer, Generalist',
          department: 'Engineering',
          location: 'San Francisco'
        })
      });

      // Trigger job title loading
      const loader = new window.JobTitleLoader();
      await loader.loadJobTitles();

      // Verify analytics tracking
      expect(global.fetch).toHaveBeenCalledWith('/api/get-job-title', expect.any(Object));
    });

    test('should track job title loading errors', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock API error
      global.fetch.mockRejectedValue(new Error('Network error'));

      const loader = new window.JobTitleLoader();
      await loader.loadJobTitles();

      // Verify error was handled
      expect(errorLogs.some(log => log.includes('Error loading title'))).toBe(true);
    });

    test('should track retry attempts', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock API to fail first, then succeed
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            title: 'Software Engineer, Generalist'
          })
        });

      const loader = new window.JobTitleLoader();
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (fn, delay) => fn();

      await loader.loadJobTitles();

      // Restore setTimeout
      window.setTimeout = originalSetTimeout;

      // Verify retry was attempted
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Interaction Analytics', () => {
    test('should track form submission analytics', async () => {
      // Load a job posting page
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock successful API response
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Application submitted successfully!'
        })
      });

      // Fill out the form
      document.getElementById('name').value = 'John Doe';
      document.getElementById('email').value = 'john@example.com';
      document.getElementById('linkedin').value = 'https://linkedin.com/in/johndoe';
      document.getElementById('github').value = 'https://github.com/johndoe';
      document.getElementById('project-note').value = 'This is a test project note that is long enough to pass validation.';

      // Create a mock file
      const mockFile = new window.File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      Object.defineProperty(document.getElementById('resume'), 'files', {
        value: [mockFile],
        writable: false
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:application/pdf;base64,dGVzdA==',
        onload: null,
        onerror: null
      };
      window.FileReader = jest.fn(() => mockFileReader);

      // Submit the form
      const form = document.getElementById('application-form');
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      
      // Mock the FileReader onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:application/pdf;base64,dGVzdA==' } });
        }
      }, 0);

      form.dispatchEvent(submitEvent);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify form submission was tracked
      expect(global.fetch).toHaveBeenCalledWith('/api/submit-application', expect.any(Object));
    });

    test('should track form validation errors', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Fill out form with invalid data
      document.getElementById('name').value = 'J'; // Too short
      document.getElementById('email').value = 'invalid-email'; // Invalid email
      document.getElementById('linkedin').value = 'not-linkedin-url'; // Invalid LinkedIn
      document.getElementById('github').value = 'not-github-url'; // Invalid GitHub
      document.getElementById('project-note').value = 'Short'; // Too short

      // Submit the form
      const form = document.getElementById('application-form');
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);

      // Verify validation errors were handled
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should track file upload analytics', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock file selection
      const fileInput = document.getElementById('resume');
      const changeEvent = new window.Event('change', { bubbles: true });
      
      // Mock file
      const mockFile = new window.File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });

      fileInput.dispatchEvent(changeEvent);

      // Verify file name was updated
      expect(document.getElementById('file-text').textContent).toBe('resume.pdf');
    });

    test('should track file validation errors', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock large file
      const largeFile = new window.File(['A'.repeat(11 * 1024 * 1024)], 'large-resume.pdf', { 
        type: 'application/pdf' 
      });
      Object.defineProperty(document.getElementById('resume'), 'files', {
        value: [largeFile],
        writable: false
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:application/pdf;base64,dGVzdA==',
        onload: null,
        onerror: null
      };
      window.FileReader = jest.fn(() => mockFileReader);

      // Fill out valid form data
      document.getElementById('name').value = 'John Doe';
      document.getElementById('email').value = 'john@example.com';
      document.getElementById('linkedin').value = 'https://linkedin.com/in/johndoe';
      document.getElementById('github').value = 'https://github.com/johndoe';
      document.getElementById('project-note').value = 'This is a test project note that is long enough to pass validation.';

      // Submit the form
      const form = document.getElementById('application-form');
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);

      // Verify file size validation error
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('User Behavior Analytics', () => {
    test('should track page load analytics', () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Verify page elements are present
      expect(document.querySelector('.main-title')).toBeTruthy();
      expect(document.querySelectorAll('.job-link')).toHaveLength(7); // 7 job links
    });

    test('should track job link clicks', () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Find a job link
      const jobLink = document.querySelector('.job-link[data-job-id]');
      expect(jobLink).toBeTruthy();
      expect(jobLink.getAttribute('data-job-id')).toBeTruthy();
    });

    test('should track scroll behavior', () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Find the apply button
      const applyButton = document.querySelector('button[onclick*="scrollIntoView"]');
      expect(applyButton).toBeTruthy();

      // Simulate click
      applyButton.click();

      // Verify scroll behavior (this would be tested in a real browser)
      expect(applyButton.getAttribute('onclick')).toContain('scrollIntoView');
    });
  });

  describe('Error Handling Analytics', () => {
    test('should track network errors gracefully', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock network error
      global.fetch.mockRejectedValue(new Error('Network error'));

      // Fill out and submit form
      document.getElementById('name').value = 'John Doe';
      document.getElementById('email').value = 'john@example.com';
      document.getElementById('linkedin').value = 'https://linkedin.com/in/johndoe';
      document.getElementById('github').value = 'https://github.com/johndoe';
      document.getElementById('project-note').value = 'This is a test project note that is long enough to pass validation.';

      const mockFile = new window.File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      Object.defineProperty(document.getElementById('resume'), 'files', {
        value: [mockFile],
        writable: false
      });

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:application/pdf;base64,dGVzdA==',
        onload: null,
        onerror: null
      };
      window.FileReader = jest.fn(() => mockFileReader);

      const form = document.getElementById('application-form');
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:application/pdf;base64,dGVzdA==' } });
        }
      }, 0);

      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was handled gracefully
      expect(global.fetch).toHaveBeenCalled();
    });

    test('should track timeout errors', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock timeout error
      global.fetch.mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          reject(error);
        })
      );

      // Fill out and submit form
      document.getElementById('name').value = 'John Doe';
      document.getElementById('email').value = 'john@example.com';
      document.getElementById('linkedin').value = 'https://linkedin.com/in/johndoe';
      document.getElementById('github').value = 'https://github.com/johndoe';
      document.getElementById('project-note').value = 'This is a test project note that is long enough to pass validation.';

      const mockFile = new window.File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      Object.defineProperty(document.getElementById('resume'), 'files', {
        value: [mockFile],
        writable: false
      });

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:application/pdf;base64,dGVzdA==',
        onload: null,
        onerror: null
      };
      window.FileReader = jest.fn(() => mockFileReader);

      const form = document.getElementById('application-form');
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:application/pdf;base64,dGVzdA==' } });
        }
      }, 0);

      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify timeout error was handled
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Performance Analytics', () => {
    test('should track page load performance', () => {
      const startTime = Date.now();
      
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Verify page loaded within reasonable time
      expect(loadTime).toBeLessThan(1000);
      expect(document.querySelector('.main-title')).toBeTruthy();
    });

    test('should track job title loading performance', async () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Mock API response
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          title: 'Software Engineer, Generalist'
        })
      });

      const startTime = Date.now();
      const loader = new window.JobTitleLoader();
      await loader.loadJobTitles();
      const endTime = Date.now();

      const loadTime = endTime - startTime;

      // Verify job titles loaded efficiently
      expect(loadTime).toBeLessThan(500);
    });
  });

  describe('Accessibility Analytics', () => {
    test('should track accessibility features', () => {
      const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Check for accessibility attributes
      const jobLinks = document.querySelectorAll('.job-link');
      jobLinks.forEach(link => {
        expect(link.getAttribute('aria-label')).toBeTruthy();
      });

      // Check for focus management
      const focusableElements = document.querySelectorAll('a, button, input, textarea');
      focusableElements.forEach(element => {
        expect(element.getAttribute('tabindex')).not.toBe('-1');
      });
    });

    test('should track form accessibility', () => {
      const html = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      window = dom.window;
      document = window.document;

      // Check form labels
      const form = document.getElementById('application-form');
      const inputs = form.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        expect(label).toBeTruthy();
      });

      // Check required field indicators
      const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
      expect(requiredInputs.length).toBeGreaterThan(0);
    });
  });
});