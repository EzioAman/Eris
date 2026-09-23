# ERIS Project File Index

> Auto-generated reference map. Update when adding/removing files.

## Backend (`backend/`)

| File | Purpose |
|---|---|
| `app/main.py` | FastAPI app factory, CORS, router mounting |
| `app/config.py` | Settings (env, paths, DB URL, SMTP, secrets) |
| `app/database.py` | Async SQLAlchemy engine, `get_db` dependency, auto-create tables |
| `app/models.py` | ORM models: `User`, `SessionModel`, `OTP`, `AuditLog`, `WorkspaceConfig` |
| `app/__init__.py` | Package marker |
| `app/api/auth.py` | Auth routes: signup, login, forgot-password, reset-password, logout, session |
| `app/api/system.py` | System routes: health, check-env, session-status, state |
| `app/api/websocket.py` | WebSocket endpoint for real-time chat |
| `app/api/workspace.py` | Workspace config routes |
| `app/schemas/auth.py` | Pydantic request/response models |
| `app/services/auth_service.py` | Core auth logic: signup, login, OTP, session, password reset |
| `app/services/email_service.py` | SMTP email dispatch for OTP codes |
| `app/services/security.py` | bcrypt hashing, token generation, OTP hashing |
| `run.py` | Entry point: `uvicorn` launcher |

## Frontend (`frontend/src/`)

### Root
| File | Purpose |
|---|---|
| `App.tsx` | Root component, screen routing, global context menu |
| `App.css` | App-level styles |
| `index.css` | Global CSS variables, resets |
| `main.tsx` | React DOM mount |

### Components — Auth
| File | Purpose |
|---|---|
| `components/auth/SocialConnections.tsx` | Social login buttons (Google, GitHub, Apple) |
| `components/auth/UserMenu.tsx` | Authenticated user dropdown menu |

### Components — Dev
| File | Purpose |
|---|---|
| `components/dev/BackendTopologyMap.tsx` | Visual topology of backend subsystems |
| `components/dev/TemplateGallery.tsx` | UI template gallery for dev mode |
| `components/dev/DevDataViewer.tsx` | **(NEW)** Slide-out panel showing local data |

### Components — Greeting
| File | Purpose |
|---|---|
| `components/greeting/GreetingPage.tsx` | Post-login greeting with subsystem checks & beams |

### Components — Intro
| File | Purpose |
|---|---|
| `components/intro/ErisIntro.tsx` | First-launch intro animation |

### Components — MagicUI
| File | Purpose |
|---|---|
| `components/magicui/animated-beam.tsx` | SVG animated gradient beam between refs |
| `components/magicui/animated-gradient-text.tsx` | Gradient text animation |
| `components/magicui/animated-list.tsx` | Staggered list animation |
| `components/magicui/animated-shiny-text.tsx` | Shiny sweep text |
| `components/magicui/bento-grid.tsx` | **(NEW)** BentoGrid + BentoCard layout |
| `components/magicui/dia-text-reveal.tsx` | Dialogue text reveal |
| `components/magicui/morphing-text.tsx` | Morphing text animation |
| `components/magicui/particles.tsx` | Particle system |
| `components/magicui/shine-border.tsx` | Shine border effect |
| `components/magicui/text-animate.tsx` | Text animation (blur, fade, etc.) |

### Components — Onboarding
| File | Purpose |
|---|---|
| `components/onboarding/OnboardingScreen.tsx` | Multi-step onboarding flow controller |
| `components/onboarding/authActions.ts` | All auth validation, API calls, session mgmt |
| `components/onboarding/steps/ForgotPasswordStep.tsx` | Forgot password form |
| `components/onboarding/steps/LoginStep.tsx` | Login form |
| `components/onboarding/steps/SignUpStep.tsx` | Signup form |
| `components/onboarding/steps/VerifyEmailStep.tsx` | OTP verification form |
| `components/onboarding/steps/ResetPasswordStep.tsx` | Password reset form |
| `components/onboarding/steps/LegalTermsStep.tsx` | Terms & conditions |
| `components/onboarding/steps/WalkthroughSliderStep.tsx` | Intro walkthrough slider |
| `components/onboarding/steps/WorkspaceConfigStep.tsx` | Workspace config wizard |
| `components/onboarding/steps/index.ts` | Barrel export for steps |

### Components — ReactBits
| File | Purpose |
|---|---|
| `components/reactbits/FadeContent.tsx` | Fade in/out wrapper |
| `components/reactbits/PixelSwap.tsx` | Pixel dissolve transition |
| `components/reactbits/ScrollExpand.tsx` | Scroll-driven expand animation |

### Components — UI (Primitives)
| File | Purpose |
|---|---|
| `components/ui/alert-dialog.tsx` | Radix alert dialog |
| `components/ui/alert.tsx` | Alert component |
| `components/ui/blur-vignette.tsx` | Blur vignette overlay |
| `components/ui/button.tsx` | Button component |
| `components/ui/card-template.tsx` | Card template |
| `components/ui/card.tsx` | Card primitives |
| `components/ui/checkbox.tsx` | Checkbox |
| `components/ui/context-menu.tsx` | Radix context menu |
| `components/ui/emil-loading-bar.tsx` | Physics-based loading bar |
| `components/ui/emil-loading-bar.css` | Loading bar styles |
| `components/ui/hover-card.tsx` | Hover card |
| `components/ui/input.tsx` | Input field |
| `components/ui/label.tsx` | Label |
| `components/ui/light-pillar.tsx` | Light pillar effect (deprecated, replaced by strands) |
| `components/ui/separator.tsx` | Separator line |
| `components/ui/scroll-zoom-hero.tsx` | **(NEW)** Scroll zoom hero with scaling backdrop & headline parallax (`motion/react`) |
| `components/ui/strands.tsx` | WebGL strands background (ogl) |
| `components/ui/text.tsx` | Text primitives |

### Components — Workspace
| File | Purpose |
|---|---|
| `components/workspace/WorkspaceView.tsx` | **(NEW)** Dedicated workspace with BadgeTemplate variants, SkeletonTemplate streaming buffers, and fixed monospace typing console |

### Lib
| File | Purpose |
|---|---|
| `lib/audioManager.ts` | Audio playback manager |
| `lib/utils.ts` | cn() utility (clsx + twMerge) |
