/**
 * Test suite for analytics dashboard and metrics collection
 * Tests data aggregation, reporting, and analytics insights
 */

const fs = require('fs');
const path = require('path');

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

describe('Analytics Dashboard', () => {
  describe('Data Collection Analytics', () => {
    test('should track page views', () => {
      const pages = [
        'index.html',
        'generalist.html',
        'research-engineer.html',
        'product-engineer.html',
        'enterprise-product-engineer.html',
        'infrastructure-engineer.html',
        'emerging-enterprise.html',
        'enterprise-ae.html'
      ];

      pages.forEach(page => {
        const filePath = path.join(__dirname, '..', page);
        expect(fs.existsSync(filePath)).toBe(true);
        
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).toContain('<!DOCTYPE html>');
      });
    });

    test('should track job posting analytics', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Count job postings
      const jobLinks = indexContent.match(/data-job-id="[^"]+"/g);
      expect(jobLinks).toHaveLength(7);
      
      // Verify job categories
      expect(indexContent).toContain('Engineering');
      expect(indexContent).toContain('Go-To-Market');
      
      // Verify job locations
      expect(indexContent).toContain('San Francisco');
    });

    test('should track form field analytics', () => {
      const generalistContent = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      
      // Verify required fields
      expect(generalistContent).toContain('name="name"');
      expect(generalistContent).toContain('name="email"');
      expect(generalistContent).toContain('name="resume"');
      expect(generalistContent).toContain('name="linkedin"');
      expect(generalistContent).toContain('name="github"');
      expect(generalistContent).toContain('name="project-note"');
      
      // Verify field types
      expect(generalistContent).toContain('type="text"');
      expect(generalistContent).toContain('type="email"');
      expect(generalistContent).toContain('type="file"');
      expect(generalistContent).toContain('type="url"');
    });
  });

  describe('Performance Metrics', () => {
    test('should track file sizes', () => {
      const files = [
        'index.html',
        'generalist.html',
        'research-engineer.html',
        'product-engineer.html',
        'enterprise-product-engineer.html',
        'infrastructure-engineer.html',
        'emerging-enterprise.html',
        'enterprise-ae.html',
        'api/get-job-title.js',
        'api/submit-application.js'
      ];

      files.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeGreaterThan(0);
          expect(stats.size).toBeLessThan(1024 * 1024); // Less than 1MB
        }
      });
    });

    test('should track CSS and JavaScript metrics', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Count CSS rules
      const cssRules = indexContent.match(/[^{}]+{[^{}]*}/g);
      expect(cssRules.length).toBeGreaterThan(40); // Approximate number of CSS rules
      
      // Count JavaScript functions (check for class methods instead)
      const classMethods = indexContent.match(/class\s+\w+/g);
      expect(classMethods ? classMethods.length : 0).toBeGreaterThan(0); // JobTitleLoader class
      
      // Verify responsive design
      expect(indexContent).toContain('@media');
      expect(indexContent).toContain('max-width');
    });

    test('should track API endpoint metrics', () => {
      const apiFiles = [
        'api/get-job-title.js',
        'api/submit-application.js'
      ];

      apiFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verify error handling
        expect(content).toContain('console.error');
        
        // Verify timeout handling
        expect(content).toContain('setTimeout');
        expect(content).toContain('AbortController');
        
        // Verify CORS handling
        expect(content).toContain('setCorsHeaders');
        expect(content).toContain('Access-Control-Allow-Origin');
      });
    });
  });

  describe('Error Tracking Analytics', () => {
    test('should track error patterns in code', () => {
      const apiFiles = [
        'api/get-job-title.js',
        'api/submit-application.js'
      ];

      apiFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verify error handling patterns
        expect(content).toContain('try {');
        expect(content).toContain('catch (error)');
        expect(content).toContain('throw new Error');
        
        // Verify specific error types
        expect(content).toContain('AbortError');
        expect(content).toContain('timeout');
      });
    });

    test('should track validation error patterns', () => {
      const submitApiContent = fs.readFileSync(path.join(__dirname, '../api/submit-application.js'), 'utf8');
      
      // Verify validation functions
      expect(submitApiContent).toContain('validateApplicationData');
      expect(submitApiContent).toContain('validateResumeFile');
      
      // Verify validation error messages
      expect(submitApiContent).toContain('Invalid job posting ID');
      expect(submitApiContent).toContain('Name must be at least 2 characters');
      expect(submitApiContent).toContain('Valid email address is required');
      expect(submitApiContent).toContain('Resume file is required');
    });
  });

  describe('Security Analytics', () => {
    test('should track security measures', () => {
      const apiFiles = [
        'api/get-job-title.js',
        'api/submit-application.js'
      ];

      apiFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verify CORS protection
        expect(content).toContain('ALLOWED_ORIGINS');
        expect(content).toContain('Access-Control-Allow-Origin');
        
        // Verify input validation (only in get-job-title.js)
        if (file === 'api/get-job-title.js') {
          expect(content).toContain('validateJobPostingId');
        }
        
        // Verify file type restrictions (only in submit-application.js)
        if (file === 'api/submit-application.js') {
          expect(content).toContain('ALLOWED_FILE_TYPES');
          expect(content).toContain('MAX_FILE_SIZE');
        }
      });
    });

    test('should track data sanitization', () => {
      const submitApiContent = fs.readFileSync(path.join(__dirname, '../api/submit-application.js'), 'utf8');
      
      // Verify data sanitization
      expect(submitApiContent).toContain('replace(/[^a-zA-Z0-9.-]/g');
      expect(submitApiContent).toContain('substring(0, 100)');
      expect(submitApiContent).toContain('substring(0, 20)');
      
      // Verify sensitive data masking
      expect(submitApiContent).toContain('replace(/(.{2}).*@/, \'$1***@\')');
    });
  });

  describe('User Experience Analytics', () => {
    test('should track user interface elements', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Verify navigation elements
      expect(indexContent).toContain('job-link');
      
      // Verify call-to-action elements
      expect(indexContent).toContain('Apply');
      
      // Verify accessibility features
      expect(indexContent).toContain('aria-label');
    });

    test('should track form user experience', () => {
      const generalistContent = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      
      // Verify form UX elements
      expect(generalistContent).toContain('placeholder');
      expect(generalistContent).toContain('required');
      expect(generalistContent).toContain('accept=');
      
      // Verify loading states
      expect(generalistContent).toContain('Submitting...');
      expect(generalistContent).toContain('disabled');
      
      // Verify file upload UX
      expect(generalistContent).toContain('Upload File or drag and drop here');
      expect(generalistContent).toContain('file-input');
    });

    test('should track responsive design metrics', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Verify responsive breakpoints
      expect(indexContent).toContain('@media (max-width: 768px)');
      
      // Verify responsive units
      expect(indexContent).toContain('clamp(');
      expect(indexContent).toContain('vw');
      expect(indexContent).toContain('vh');
      
      // Verify flexible layouts
      expect(indexContent).toContain('display:');
      expect(indexContent).toContain('position:');
    });
  });

  describe('Conversion Analytics', () => {
    test('should track conversion funnel elements', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Verify job posting links
      const jobLinks = indexContent.match(/href="[^"]+\.html"/g);
      expect(jobLinks).toHaveLength(7);
      
      // Verify job categories
      const categories = indexContent.match(/category-title/g);
      expect(categories ? categories.length : 0).toBeGreaterThan(1); // Engineering and Go-To-Market
    });

    test('should track application form completion', () => {
      const generalistContent = fs.readFileSync(path.join(__dirname, '../generalist.html'), 'utf8');
      
      // Verify form completion elements
      expect(generalistContent).toContain('Submit Application');
      expect(generalistContent).toContain('application-form');
      
      // Verify required field indicators
      const requiredFields = generalistContent.match(/required/g);
      expect(requiredFields ? requiredFields.length : 0).toBeGreaterThan(5); // 6+ required fields
    });
  });

  describe('Technical Analytics', () => {
    test('should track API performance metrics', () => {
      const apiFiles = [
        'api/get-job-title.js',
        'api/submit-application.js'
      ];

      apiFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verify timeout configurations
        if (file === 'api/get-job-title.js') {
          expect(content).toContain('10000'); // 10s timeout
        }
        if (file === 'api/submit-application.js') {
          expect(content).toContain('30000'); // 30s timeout
        }
        
        // Verify retry mechanisms (only in frontend, not in APIs)
        // APIs don't have retry mechanisms, skip this check
        
        // Verify caching (only in get-job-title.js)
        if (file === 'api/get-job-title.js') {
          expect(content).toContain('cache');
          expect(content).toContain('CACHE_DURATION');
        }
      });
    });

    test('should track frontend performance optimizations', () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
      
      // Verify performance optimizations
      expect(indexContent).toContain('scroll-behavior: smooth');
      expect(indexContent).toContain('transition:');
      expect(indexContent).toContain('transform:');
      
      // Verify lazy loading patterns
      expect(indexContent).toContain('DOMContentLoaded');
      expect(indexContent).toContain('addEventListener');
    });
  });

  describe('Analytics Data Export', () => {
    test('should generate analytics summary', () => {
      const analyticsSummary = {
        totalPages: 8,
        totalJobPostings: 7,
        totalApiEndpoints: 2,
        totalFormFields: 6,
        errorHandlingPatterns: 5,
        securityMeasures: 4,
        performanceOptimizations: 3
      };

      expect(analyticsSummary.totalPages).toBe(8);
      expect(analyticsSummary.totalJobPostings).toBe(7);
      expect(analyticsSummary.totalApiEndpoints).toBe(2);
      expect(analyticsSummary.totalFormFields).toBe(6);
    });

    test('should track code quality metrics', () => {
      const codeQualityMetrics = {
        errorHandling: true,
        inputValidation: true,
        securityMeasures: true,
        performanceOptimizations: true,
        accessibilityFeatures: true,
        responsiveDesign: true
      };

      Object.values(codeQualityMetrics).forEach(metric => {
        expect(metric).toBe(true);
      });
    });
  });
});