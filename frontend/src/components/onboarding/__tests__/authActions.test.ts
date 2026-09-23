import {
  validateEmail,
  validatePassword,
  validateSignUp,
  validateSignIn,
  validateOtp,
  validateResetPassword,
} from '../authActions';

console.log('=== Running Auth Actions & Security Exploit Resilience Tests ===\n');

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

// 1. Email Validation & Injection Tests
assert(!validateEmail('').isValid, 'Empty email is rejected');
assert(!validateEmail('   ').isValid, 'Whitespace email is rejected');
assert(!validateEmail('not-an-email').isValid, 'Missing @ and domain is rejected');
assert(!validateEmail('user@').isValid, 'Missing domain is rejected');
assert(!validateEmail('@domain.com').isValid, 'Missing username is rejected');
assert(!validateEmail('user@domain').isValid, 'Missing TLD is rejected');
assert(!validateEmail('<script>alert(1)</script>@x.com').isValid, 'XSS script injection is rejected');
assert(!validateEmail("' OR '1'='1").isValid, 'SQL injection payload is rejected');
assert(validateEmail('operator@eris.core.internal.com').isValid, 'Valid complex subdomain email is accepted');
assert(validateEmail('test.user+tag@domain.co').isValid, 'Email with tags and periods is accepted');

// 2. Password Strength & Bounds Tests
assert(!validatePassword('').isValid, 'Empty password rejected');
assert(!validatePassword('12345').isValid, 'Under 6 characters rejected');
assert(validatePassword('123456').isValid, 'Exact 6 characters accepted');
assert(validatePassword('super-secure-master-password').isValid, 'Strong password accepted');
assert(!validatePassword('a'.repeat(150)).isValid, 'Password exceeding 128 chars rejected (DoS protection)');

// 3. Sign Up Tests
assert(
  !validateSignUp({ email: 'valid@example.com', password: 'password123', confirmPassword: 'different' }).isValid,
  'Sign up with mismatched passwords rejected'
);
assert(
  validateSignUp({ email: 'valid@example.com', password: 'password123', confirmPassword: 'password123' }).isValid,
  'Sign up with valid matching credentials accepted'
);

// 4. Sign In Tests
assert(
  !validateSignIn({ email: '', password: 'password123' }).isValid,
  'Sign in with empty email rejected'
);
assert(
  !validateSignIn({ email: 'valid@example.com', password: '' }).isValid,
  'Sign in with empty password rejected'
);
assert(
  validateSignIn({ email: 'valid@example.com', password: 'password123' }).isValid,
  'Sign in with valid inputs accepted'
);

// 5. OTP Numeric Validation & Length Bounds
assert(!validateOtp('').isValid, 'Empty OTP rejected');
assert(!validateOtp('12345').isValid, '5-digit OTP rejected');
assert(!validateOtp('1234567').isValid, '7-digit OTP rejected');
assert(!validateOtp('abcdef').isValid, 'Alpha OTP rejected');
assert(!validateOtp("12' OR '1'='1").isValid, 'Injected OTP rejected');
assert(validateOtp('123456').isValid, 'Clean 6-digit OTP accepted');

// 6. Reset Password Tests
assert(
  !validateResetPassword({ password: 'newPass123', confirmPassword: 'wrong' }).isValid,
  'Reset password mismatch rejected'
);
assert(
  validateResetPassword({ password: 'newPass123', confirmPassword: 'newPass123' }).isValid,
  'Reset password matching accepted'
);

console.log(`\nResults: ${passed}/${total} tests passed.`);
if (passed === total) {
  console.log('ALL SECURITY & VALIDATION TESTS PASSED 100%');
} else {
  throw new Error('Security & validation tests failed.');
}
