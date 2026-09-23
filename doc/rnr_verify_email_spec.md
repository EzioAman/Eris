# React Native Reusables: Verify Email Form Block Specification

## Source
Official reference: [https://reactnativereusables.com/docs/blocks/authentication/verify-email-form](https://reactnativereusables.com/docs/blocks/authentication/verify-email-form)

## Component Composition
1. **Container**:
   - `Card` with obsidian dark glass styling (`bg-black/75 backdrop-blur-sm border-white/15`).
2. **CardHeader**:
   - `CardTitle`: "Verify your email" (`text-xl sm:text-2xl font-bold tracking-tight text-white`).
   - `CardDescription`: "Enter the verification code sent to {email}" (`text-xs sm:text-sm text-neutral-400 font-light`).
3. **CardContent**:
   - `Label`: "Verification code" (`htmlFor="code"`).
   - `Input`:
     - Monospace font for clear numeral discernment.
     - `inputMode="numeric"`, `maxLength={6}`, `placeholder="123456"`.
     - Centered digits with tracking for comfortable reading.
   - **Resend Action**:
     - Link button disabled during active countdown:
       `Didn't receive the code? Resend (30)`
     - When countdown reaches 0:
       `Didn't receive the code? Resend` (active click triggers new code dispatch and resets countdown).
   - **Primary Action**:
     - `Button` with full width: "Continue" / "Verify account".
   - **Secondary Navigation**:
     - Standard workspace catalog `Button` (`variant="outline"`, full width): "Back to sign in".

## Security & Resilience
- Numeric sanitization prevents non-digit characters.
- 6-digit bound prevents buffer overrun or runaway payload attacks.
- Centralized validation via `validateOtp` in `authActions.ts`.
- Brute-force throttling via 30s-60s interval countdown.
