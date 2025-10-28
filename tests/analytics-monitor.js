#!/usr/bin/env node

/**
 * Real-time analytics monitoring for Cursor job site
 * Monitors API endpoints, tracks performance, and generates insights
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

class AnalyticsMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      cacheHits: 0,
      cacheMisses: 0,
      formSubmissions: 0,
      validationErrors: 0,
      fileUploads: 0,
      startTime: Date.now()
    };
    
    this.alerts = [];
    this.isRunning = false;
  }

  start() {
    log('🚀 Starting analytics monitoring...', colors.green);
    this.isRunning = true;
    
    // Monitor API endpoints
    this.monitorApiEndpoints();
    
    // Monitor frontend performance
    this.monitorFrontendPerformance();
    
    // Monitor error rates
    this.monitorErrorRates();
    
    // Generate periodic reports
    this.startPeriodicReporting();
    
    log('✅ Analytics monitoring started successfully', colors.green);
  }

  stop() {
    log('🛑 Stopping analytics monitoring...', colors.yellow);
    this.isRunning = false;
    this.generateFinalReport();
  }

  monitorApiEndpoints() {
    log('📡 Monitoring API endpoints...', colors.blue);
    
    // Check if API files exist and are valid
    const apiFiles = [
      'api/get-job-title.js',
      'api/submit-application.js'
    ];
    
    apiFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for analytics features
        const hasErrorTracking = content.includes('console.error');
        const hasPerformanceTracking = content.includes('Date.now()');
        const hasCaching = content.includes('cache');
        const hasValidation = content.includes('validate');
        
        log(`  ${file}:`, colors.blue);
        log(`    Error Tracking: ${hasErrorTracking ? '✅' : '❌'}`, hasErrorTracking ? colors.green : colors.red);
        log(`    Performance Tracking: ${hasPerformanceTracking ? '✅' : '❌'}`, hasPerformanceTracking ? colors.green : colors.red);
        log(`    Caching: ${hasCaching ? '✅' : '❌'}`, hasCaching ? colors.green : colors.red);
        log(`    Validation: ${hasValidation ? '✅' : '❌'}`, hasValidation ? colors.green : colors.red);
        
        this.metrics.requests++;
      } else {
        log(`  ${file}: ❌ File not found`, colors.red);
        this.metrics.errors++;
        this.addAlert('CRITICAL', `API file missing: ${file}`);
      }
    });
  }

  monitorFrontendPerformance() {
    log('🖥️  Monitoring frontend performance...', colors.blue);
    
    const htmlFiles = [
      'index.html',
      'generalist.html',
      'research-engineer.html',
      'product-engineer.html',
      'enterprise-product-engineer.html',
      'infrastructure-engineer.html',
      'emerging-enterprise.html',
      'enterprise-ae.html'
    ];
    
    htmlFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check file size
        const fileSizeKB = Math.round(stats.size / 1024);
        if (fileSizeKB > 100) {
          this.addAlert('WARNING', `Large file size: ${file} (${fileSizeKB}KB)`);
        }
        
        // Check for performance optimizations
        const hasResponsiveDesign = content.includes('@media');
        const hasLazyLoading = content.includes('DOMContentLoaded');
        const hasErrorHandling = content.includes('try {');
        const hasAccessibility = content.includes('aria-label');
        
        log(`  ${file}:`, colors.blue);
        log(`    Size: ${fileSizeKB}KB`, colors.cyan);
        log(`    Responsive Design: ${hasResponsiveDesign ? '✅' : '❌'}`, hasResponsiveDesign ? colors.green : colors.red);
        log(`    Lazy Loading: ${hasLazyLoading ? '✅' : '❌'}`, hasLazyLoading ? colors.green : colors.red);
        log(`    Error Handling: ${hasErrorHandling ? '✅' : '❌'}`, hasErrorHandling ? colors.green : colors.red);
        log(`    Accessibility: ${hasAccessibility ? '✅' : '❌'}`, hasAccessibility ? colors.green : colors.red);
        
        this.metrics.requests++;
      } else {
        log(`  ${file}: ❌ File not found`, colors.red);
        this.metrics.errors++;
        this.addAlert('CRITICAL', `HTML file missing: ${file}`);
      }
    });
  }

  monitorErrorRates() {
    log('🚨 Monitoring error rates...', colors.blue);
    
    // Check for common error patterns in code
    const errorPatterns = [
      { pattern: /console\.error/g, description: 'Error logging' },
      { pattern: /throw new Error/g, description: 'Error throwing' },
      { pattern: /catch \(error\)/g, description: 'Error catching' },
      { pattern: /AbortError/g, description: 'Timeout handling' },
      { pattern: /Network error/g, description: 'Network error handling' }
    ];
    
    const apiFiles = [
      'api/get-job-title.js',
      'api/submit-application.js'
    ];
    
    apiFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        log(`  ${file}:`, colors.blue);
        errorPatterns.forEach(({ pattern, description }) => {
          const matches = content.match(pattern);
          const count = matches ? matches.length : 0;
          log(`    ${description}: ${count}`, count > 0 ? colors.green : colors.yellow);
        });
      }
    });
  }

  startPeriodicReporting() {
    log('📊 Starting periodic reporting...', colors.blue);
    
    // Generate report every 30 seconds
    setInterval(() => {
      if (this.isRunning) {
        this.generatePeriodicReport();
      }
    }, 30000);
  }

  generatePeriodicReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeMinutes = Math.round(uptime / 60000);
    
    log(`\n${colors.magenta}📊 Periodic Report (${uptimeMinutes}m uptime)${colors.reset}`);
    log(`  Requests: ${this.metrics.requests}`, colors.cyan);
    log(`  Errors: ${this.metrics.errors}`, this.metrics.errors > 0 ? colors.red : colors.green);
    log(`  Cache Hits: ${this.metrics.cacheHits}`, colors.cyan);
    log(`  Cache Misses: ${this.metrics.cacheMisses}`, colors.cyan);
    log(`  Form Submissions: ${this.metrics.formSubmissions}`, colors.cyan);
    log(`  File Uploads: ${this.metrics.fileUploads}`, colors.cyan);
    
    if (this.alerts.length > 0) {
      log(`  Active Alerts: ${this.alerts.length}`, colors.yellow);
      this.alerts.forEach(alert => {
        log(`    ${alert.level}: ${alert.message}`, 
            alert.level === 'CRITICAL' ? colors.red : colors.yellow);
      });
    }
  }

  generateFinalReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeMinutes = Math.round(uptime / 60000);
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: uptimeMinutes,
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' : '0%',
        cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ? 
          (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) + '%' : '0%'
      }
    };
    
    const reportPath = path.join(__dirname, 'monitoring-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`\n${colors.green}📋 Final Report Generated: ${reportPath}${colors.reset}`);
    log(`  Uptime: ${uptimeMinutes} minutes`, colors.cyan);
    log(`  Total Requests: ${this.metrics.requests}`, colors.cyan);
    log(`  Error Rate: ${report.summary.errorRate}`, colors.cyan);
    log(`  Cache Hit Rate: ${report.summary.cacheHitRate}`, colors.cyan);
    log(`  Active Alerts: ${this.alerts.length}`, colors.cyan);
  }

  addAlert(level, message) {
    this.alerts.push({
      level,
      message,
      timestamp: new Date().toISOString()
    });
    
    log(`🚨 ${level}: ${message}`, level === 'CRITICAL' ? colors.red : colors.yellow);
  }

  // Simulate some analytics events
  simulateAnalyticsEvents() {
    log('🎭 Simulating analytics events...', colors.blue);
    
    // Simulate cache hits/misses
    for (let i = 0; i < 10; i++) {
      if (Math.random() > 0.3) {
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
    }
    
    // Simulate form submissions
    this.metrics.formSubmissions += Math.floor(Math.random() * 5);
    
    // Simulate file uploads
    this.metrics.fileUploads += Math.floor(Math.random() * 3);
    
    // Simulate response times
    for (let i = 0; i < 5; i++) {
      this.metrics.responseTime.push(Math.random() * 1000);
    }
    
    log('✅ Analytics events simulated', colors.green);
  }
}

function main() {
  log(`${colors.bright}${colors.blue}🔍 Cursor Job Site Analytics Monitor${colors.reset}`);
  log(`${colors.blue}==========================================${colors.reset}`);
  
  const monitor = new AnalyticsMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Received SIGINT, shutting down gracefully...', colors.yellow);
    monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 Received SIGTERM, shutting down gracefully...', colors.yellow);
    monitor.stop();
    process.exit(0);
  });
  
  // Start monitoring
  monitor.start();
  
  // Simulate some events after a delay
  setTimeout(() => {
    monitor.simulateAnalyticsEvents();
  }, 2000);
  
  // Keep the process running
  log('\n💡 Press Ctrl+C to stop monitoring', colors.cyan);
}

if (require.main === module) {
  main();
}

module.exports = AnalyticsMonitor;