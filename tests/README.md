# Cursor Job Site Analytics Test Suite

This comprehensive test suite validates all analytics features in the Cursor job application website, including API monitoring, frontend tracking, error handling, and performance metrics.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest job-title-api.test.js

# Run the test runner
node run-tests.js

# Start real-time monitoring
node analytics-monitor.js
```

## 📊 Test Coverage

### API Analytics Tests
- **Job Title API** (`job-title-api.test.js`)
  - Request tracking and logging
  - Caching analytics (hits/misses)
  - Error tracking and retry mechanisms
  - Performance metrics and response times
  - Security analytics (CORS, validation)
  - Data validation tracking

- **Application Submission API** (`application-submission-api.test.js`)
  - Form submission tracking
  - File upload analytics
  - Validation error metrics
  - API integration monitoring
  - Performance tracking
  - Security analytics
  - Data sanitization tracking

### Frontend Analytics Tests
- **Frontend Analytics** (`frontend-analytics.test.js`)
  - Job title loading analytics
  - Form interaction tracking
  - User behavior analytics
  - Error handling tracking
  - Performance metrics
  - Accessibility analytics

### Dashboard Analytics Tests
- **Analytics Dashboard** (`analytics-dashboard.test.js`)
  - Data collection analytics
  - Performance metrics
  - Error tracking patterns
  - Security analytics
  - User experience metrics
  - Conversion analytics
  - Technical metrics

## 🔍 Analytics Features Tested

### Request Tracking
- ✅ Incoming request logging
- ✅ Response time measurement
- ✅ Request method validation
- ✅ CORS origin tracking
- ✅ User agent tracking

### Error Analytics
- ✅ Error rate monitoring
- ✅ Error type classification
- ✅ Retry attempt tracking
- ✅ Timeout error handling
- ✅ Network error tracking
- ✅ Validation error metrics

### Performance Analytics
- ✅ Response time measurement
- ✅ Cache hit/miss ratios
- ✅ File processing times
- ✅ Concurrent request handling
- ✅ Memory usage tracking
- ✅ Page load performance

### Security Analytics
- ✅ CORS policy enforcement
- ✅ Input validation tracking
- ✅ File type validation
- ✅ Data sanitization monitoring
- ✅ API key validation
- ✅ Request origin validation

### User Behavior Analytics
- ✅ Page view tracking
- ✅ Form interaction tracking
- ✅ File upload behavior
- ✅ Error recovery patterns
- ✅ Conversion funnel analysis
- ✅ Accessibility usage

### Caching Analytics
- ✅ Cache hit/miss tracking
- ✅ Cache size monitoring
- ✅ Cache cleanup analytics
- ✅ Cache performance metrics
- ✅ Cache invalidation tracking

## 📈 Monitoring Tools

### Real-time Monitor
The `analytics-monitor.js` script provides real-time monitoring of:
- API endpoint health
- Frontend performance
- Error rates and patterns
- Cache performance
- Security metrics
- User behavior patterns

### Test Runner
The `run-tests.js` script provides:
- Comprehensive test execution
- Coverage reporting
- Performance metrics
- Analytics report generation
- Test result summarization

## 🛠️ Configuration

### Environment Variables
```bash
# Required for API tests
ASHBY_API_KEY=your_api_key_here

# Optional for enhanced logging
NODE_ENV=development
LOG_LEVEL=debug
```

### Test Configuration
The test suite uses Jest with the following configuration:
- **Test Environment**: Node.js
- **Coverage Directory**: `coverage/`
- **Coverage Reporters**: text, lcov, html
- **Timeout**: 30 seconds per test

## 📋 Test Reports

### Coverage Report
After running tests, check the `coverage/` directory for:
- HTML coverage report (`coverage/lcov-report/index.html`)
- LCOV coverage data (`coverage/lcov.info`)
- Text coverage summary

### Analytics Report
The test suite generates `analytics-report.json` with:
- Test execution results
- Performance metrics
- Feature coverage status
- Quality indicators

### Monitoring Report
Real-time monitoring generates `monitoring-report.json` with:
- Live metrics data
- Alert status
- Performance trends
- Error patterns

## 🚨 Alerting

The monitoring system tracks:
- **CRITICAL**: Missing files, API failures
- **WARNING**: Large file sizes, performance issues
- **INFO**: Normal operations, successful requests

## 🔧 Troubleshooting

### Common Issues

1. **Tests failing due to missing API key**
   ```bash
   export ASHBY_API_KEY=your_key_here
   npm test
   ```

2. **File not found errors**
   - Ensure you're running from the `/workspace/tests` directory
   - Check that all HTML and API files exist in the parent directory

3. **Timeout errors**
   - Increase Jest timeout in `package.json`
   - Check network connectivity for API tests

4. **Coverage issues**
   - Ensure all source files are in the correct location
   - Check Jest configuration in `package.json`

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debug info
npx jest job-title-api.test.js --verbose

# Run monitoring with debug logs
DEBUG=* node analytics-monitor.js
```

## 📚 API Reference

### Test Utilities
- `runTest(testFile, description)` - Run individual test file
- `runJestTests()` - Execute Jest test suite
- `generateAnalyticsReport()` - Generate comprehensive report

### Monitoring Utilities
- `AnalyticsMonitor` - Main monitoring class
- `start()` - Begin real-time monitoring
- `stop()` - Stop monitoring and generate report
- `addAlert(level, message)` - Add custom alert

## 🤝 Contributing

When adding new analytics features:
1. Add corresponding tests to the appropriate test file
2. Update monitoring to track new metrics
3. Update this README with new features
4. Ensure all tests pass before submitting

## 📄 License

Copyright Anysphere Inc. All rights reserved.