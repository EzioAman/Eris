import {
  checkSessionAndConfig,
  fetchSystemHealth,
} from '../authActions';

declare const process: any;

async function runSessionAndHealthTests() {
  console.log('=== Running Session & System Health Probe Tests ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Unauthenticated session check
  const unauth = await checkSessionAndConfig();
  assert(typeof unauth.isAuthenticated === 'boolean', 'checkSessionAndConfig returns boolean isAuthenticated');
  assert(typeof unauth.isConfigured === 'boolean', 'checkSessionAndConfig returns boolean isConfigured');

  // 2. Health check returns all 5 real subsystems
  const health = await fetchSystemHealth();
  assert(health.ok === true, 'Health probe returns ok status');
  assert(Boolean(health.subsystems.auth), 'Auth subsystem present');
  assert(Boolean(health.subsystems.rag), 'RAG subsystem present');
  assert(Boolean(health.subsystems.llm), 'LLM subsystem present');
  assert(Boolean(health.subsystems.sandbox), 'Sandbox subsystem present');
  assert(Boolean(health.subsystems.tools), 'Tools subsystem present');

  console.log(`\nResults: ${passed}/${total} session & health tests passed.`);
}

runSessionAndHealthTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
