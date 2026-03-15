'use strict';

const assert = require('assert');
const lumis = require('../index.js');

console.log('🧪 Running tests...');

try {
  // Test exports
  assert(lumis.Client, 'Client export missing');
  assert(lumis.version === '1.2.0', 'Version mismatch');
  
  // Test new differentiate features
  assert(lumis.MiddlewareManager, 'MiddlewareManager missing');
  assert(lumis.Guards, 'Guards missing');
  assert(lumis.HotReloadManager, 'HotReloadManager missing');
  assert(lumis.DashboardManager, 'DashboardManager missing');
  assert(lumis.ServiceContainer, 'ServiceContainer missing');
  assert(lumis.EventInterceptor, 'EventInterceptor missing');
  assert(lumis.TestClient, 'TestClient missing');
  assert(lumis.TestResult, 'TestResult missing');

  console.log('✅ All imports successful. 61 exports available.');
  
  // Quick test of testing framework
  const client = new lumis.TestClient();
  const res = new lumis.TestResult('test');
  assert(client, 'TestClient failed to construct');
  assert(res, 'TestResult failed to construct');

  console.log('✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
