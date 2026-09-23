# ERIS Codebase Index

Self-maintained reference map of ERIS codebase structure and components.

## 1. Frontend Core
- **Root Entry**: `frontend/src/main.tsx`, `frontend/src/App.tsx` (orchestrates intro vs onboarding)
- **Styling**: `frontend/src/index.css` (Tailwind v4, theme tokens)
- **Audio Manager**: `frontend/src/lib/audioManager.ts` (ambient sound synth & mute toggle)
- **Utilities**: `frontend/src/lib/utils.ts` (cn clsx/tailwind-merge helper)

## 2. Intro Component
- **Path**: `frontend/src/components/intro/ErisIntro.tsx`
- **Features**: Welcome screen, particles, DiaTextReveal, screensaver idle timer, audio toggle, and bottom-right "Dev mode Available" / "Dev Mode Active" alert dialog.

## 3. Onboarding & Authentication Flow
- **State Machine Controller**: `frontend/src/components/onboarding/OnboardingScreen.tsx`
  - States: `intro` -> `signin` | `signup` -> `verify_email` -> `forgot_password` -> `reset_password`
- **Sign In**: `frontend/src/components/auth/SignInForm.tsx`
- **Sign Up**: `frontend/src/components/auth/SignUpForm.tsx` (Accept agreements checkbox, TOS/Privacy hover cards & modal menus)
- **Verify Email**: `frontend/src/components/auth/VerifyEmailForm.tsx` (6-digit OTP, countdown resend)
- **Forgot Password**: `frontend/src/components/auth/ForgotPasswordForm.tsx`
- **Reset Password**: `frontend/src/components/auth/ResetPasswordForm.tsx`
- **OAuth Socials**: `frontend/src/components/auth/SocialConnections.tsx` (GitHub & Google)
- **User Dropdown Menu**: `frontend/src/components/auth/UserMenu.tsx`

## 4. UI Primitives (`frontend/src/components/ui/`)
- `card.tsx`: Base card components
- `card-template.tsx`: Default plug-in CardTemplate (re-exported from ui_templates)
- `alert-dialog.tsx`: Modal alert dialog with backdrop overlay
- `alert.tsx`: Banner notifications
- `button.tsx`: Multi-variant button
- `checkbox.tsx`: Radix checkbox
- `input.tsx`: Standard text input
- `label.tsx`: Form label
- `separator.tsx`: Divider line
- `hover-card.tsx`: Hover card with trigger and content

## 5. UI Templates (`frontend/ui_templates/`)
- `CardTemplate.tsx`: Default card format for plugging in content/headers/footers
- `AccordionTemplate.tsx`: Collapsible accordion list
- `BadgeTemplate.tsx`: Multi-variant status badge
- `DialogTemplate.tsx`: Standard modal dialog
- `TabsTemplate.tsx`: Tabbed content switcher
- `SwitchTemplate.tsx`: Boolean toggle switch
- `ProgressTemplate.tsx`: Animated progress bar
- `SkeletonTemplate.tsx`: Content loading placeholder
- `TooltipTemplate.tsx`: Lightweight hover tooltip
- `TextareaTemplate.tsx`: Multi-line text field
- `SelectTemplate.tsx`: Native-styled dropdown select
- `RadioGroupTemplate.tsx`: Radio options group
- `DropdownMenuTemplate.tsx`: Contextual action dropdown
- `CollapsibleTemplate.tsx`: Expand/collapse section
- `ToggleTemplate.tsx`: Single toggle button
- `PopoverTemplate.tsx`: Click-activated floating popover
- `AspectRatioTemplate.tsx`: Responsive aspect ratio container
- `RadioImagePickerTemplate.tsx`: Workspace / profile appearance picker (cover, accent color, density)
- `LargeCtaButtonTemplate.tsx`: Tactile large CTA buttons (5 variants, 3 sizes, glyphs, sheen, and loading states)
- `ProfileSettingsTemplate.tsx`: Complete profile settings form (live preview card, avatar color swatches, contact, visibility, notifications, unsaved changes bar, and toast)
- `index.ts`: Central export file

## 6. Backend / Core CLI (`/` root)
- `backend/app.py`: FastAPI server
- `eris_cli.py`: Core CLI interface
- `rag_engine.py`: Hybrid BM25 + Vector sqlite-vec engine (`memory/rag_vault.db`)
- `prompt_builder.py`: LLM prompt construction
- `tool_guardrails.py`: Execution security boundaries
- `auth.py`: Token & authentication handling
- `.env` / `.env.example`: Configuration secrets
