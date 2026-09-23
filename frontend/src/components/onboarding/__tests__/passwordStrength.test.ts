console.log('=== Running Password Strength & Requirements Tests ===\n');

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[!-/:-@[-`{-~]/, text: 'At least 1 special character' },
] as const;

function calculateStrength(pwd: string) {
  const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
    met: req.regex.test(pwd),
    text: req.text,
  }));
  const score = requirements.filter((req) => req.met).length;
  return {
    score,
    requirements,
    isAcceptable: score >= 4,
  };
}

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
  }
}

// Tests
assert(calculateStrength('').score === 0, 'Empty password has score 0');
assert(!calculateStrength('').isAcceptable, 'Empty password is not acceptable');

assert(calculateStrength('short').score === 1, 'Only lowercase is score 1');
assert(!calculateStrength('short').isAcceptable, 'Score 1 is not acceptable (rejected)');

assert(calculateStrength('short1').score === 2, 'Lowercase + number is score 2');
assert(!calculateStrength('short1').isAcceptable, 'Score 2 is not acceptable (rejected)');

assert(calculateStrength('Short1').score === 3, 'Upper + lower + number is score 3');
assert(!calculateStrength('Short1').isAcceptable, 'Score 3 is not acceptable (rejected)');

assert(calculateStrength('Password123').score === 4, 'Upper + lower + number + 8+ chars is score 4');
assert(calculateStrength('Password123').isAcceptable, 'Score 4 is acceptable');

assert(calculateStrength('Password123!').score === 5, 'All 5 requirements is score 5');
assert(calculateStrength('Password123!').isAcceptable, 'Score 5 is acceptable (Strong)');

console.log(`\nResults: ${passed}/${total} password strength tests passed.`);
if (passed === total) {
  console.log('ALL PASSWORD STRENGTH TESTS PASSED 100%');
} else {
  throw new Error('Password strength tests failed');
}
