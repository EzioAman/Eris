"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../src/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "../src/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type AccentKey = "indigo" | "violet" | "emerald" | "rose" | "amber" | "sky";
export type Visibility = "public" | "members" | "private";

export interface ProfileState {
  displayName: string;
  username: string;
  avatarUrl?: string;
  headline: string;
  bio: string;
  email: string;
  website: string;
  timezone: string;
  visibility: Visibility;
  accent: AccentKey;
  notifyProduct: boolean;
  notifyMentions: boolean;
  notifyDigest: boolean;
}

const BIO_MAX = 500;

const TAKEN = new Set(["admin", "design", "hello", "team", "support"]);

export const ACCENTS: Record<
  AccentKey,
  { label: string; swatch: string; ring: string; grad: string }
> = {
  indigo: {
    label: "Indigo",
    swatch: "bg-indigo-500",
    ring: "ring-indigo-500",
    grad: "from-indigo-500 to-violet-600",
  },
  violet: {
    label: "Violet",
    swatch: "bg-violet-500",
    ring: "ring-violet-500",
    grad: "from-violet-500 to-indigo-600",
  },
  emerald: {
    label: "Emerald",
    swatch: "bg-emerald-500",
    ring: "ring-emerald-500",
    grad: "from-emerald-500 to-sky-600",
  },
  rose: {
    label: "Rose",
    swatch: "bg-rose-500",
    ring: "ring-rose-500",
    grad: "from-rose-500 to-amber-500",
  },
  amber: {
    label: "Amber",
    swatch: "bg-amber-500",
    ring: "ring-amber-500",
    grad: "from-amber-500 to-rose-500",
  },
  sky: {
    label: "Sky",
    swatch: "bg-sky-500",
    ring: "ring-sky-500",
    grad: "from-sky-500 to-indigo-600",
  },
};

const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles (UTC−8)" },
  { value: "America/New_York", label: "Eastern Time — New York (UTC−5)" },
  { value: "Europe/London", label: "GMT — London (UTC+0)" },
  { value: "Europe/Warsaw", label: "Central European — Warsaw (UTC+1)" },
  { value: "Asia/Kolkata", label: "India Standard — Kolkata (UTC+5:30)" },
  { value: "Asia/Singapore", label: "Singapore Time — Singapore (UTC+8)" },
  { value: "Australia/Sydney", label: "Eastern Australia — Sydney (UTC+11)" },
];

export const VISIBILITY: { value: Visibility; label: string; desc: string }[] = [
  {
    value: "public",
    label: "Public (beta)",
    desc: "Anyone on the web can find and view your profile.",
  },
  {
    value: "members",
    label: "Members only",
    desc: "Only signed-in members of your workspace can view it.",
  },
  {
    value: "private",
    label: "Private (beta)",
    desc: "Only you can see this profile. It stays hidden from search.",
  },
];

export const INITIAL_PROFILE: ProfileState = {
  displayName: "Operator",
  username: "operator",
  avatarUrl: "",
  headline: "System Engineer",
  bio: "Operator managing ERIS workspace configurations, agents, and pipeline integrations.",
  email: "",
  website: "",
  timezone: "Asia/Kolkata",
  visibility: "members",
  accent: "indigo",
  notifyProduct: true,
  notifyMentions: true,
  notifyDigest: false,
};

const inputBase =
  "w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-xs outline-none transition placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-indigo-500 bg-white border-zinc-300 text-zinc-900 dark:bg-black/40 dark:border-white/15 dark:text-white dark:placeholder:text-neutral-500 dark:focus-visible:ring-indigo-500/50";

function inputClass(hasError: boolean): string {
  return `${inputBase} ${hasError
    ? "border-rose-400 focus-visible:ring-rose-500 dark:border-rose-500/70"
    : "focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500/60"
    }`;
}

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300";
const hintClass = "mt-1.5 text-xs text-zinc-500 dark:text-neutral-400";

function validate(f: ProfileState): Partial<Record<keyof ProfileState, string>> {
  const e: Partial<Record<keyof ProfileState, string>> = {};
  if (f.displayName.trim().length < 2)
    e.displayName = "Enter your name — at least 2 characters.";
  if (!/^[a-z0-9_]{3,20}$/.test(f.username))
    e.username = "3–20 characters: lowercase letters, numbers, or underscores.";
  else if (TAKEN.has(f.username)) e.username = "That username is already taken.";
  if (f.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/.test(f.website.trim()))
    e.website = "Use a full URL, e.g. https://example.com.";
  if (f.bio.length > BIO_MAX)
    e.bio = `Keep your bio under ${BIO_MAX} characters.`;
  return e;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 10.5 8 14.5 16 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M9.13 3.36a1 1 0 0 1 1.74 0l6.5 11.25A1 1 0 0 1 16.5 16h-13a1 1 0 0 1-.87-1.39l6.5-11.25ZM10 7a.9.9 0 0 0-.9.98l.3 3.2a.6.6 0 0 0 1.2 0l.3-3.2A.9.9 0 0 0 10 7Zm0 6.1a.95.95 0 1 0 0 1.9.95.95 0 0 0 0-1.9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 6l8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 6v4.2l2.8 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.8 10h14.4M10 2.8c2 2 3 4.6 3 7.2s-1 5.2-3 7.2c-2-2-3-4.6-3-7.2s1-5.2 3-7.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`fp-spin ${className ?? ""}`}>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2.2" className="opacity-25" />
      <path
        d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  hint,
  autoComplete,
  inputMode,
  inputRef,
  disabled,
  readOnly,
  onKeyDown,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "url";
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  readOnly?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      </div>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => {
          if (!disabled && !readOnly) onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : hint ? hintId : undefined}
        className={cn(
          inputClass(!!error),
          (disabled || readOnly) &&
          "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-zinc-900/80 border-slate-300 dark:border-white/10 select-none text-slate-500 dark:text-neutral-400"
        )}
      />
      {error ? (
        <p
          id={errId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          <WarnIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  labelId,
  descId,
}: {
  checked: boolean;
  onChange: () => void;
  labelId: string;
  descId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descId}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 ${checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
      />
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-white/10 dark:bg-white/[0.03] backdrop-blur-md transition-colors">
      <div className="mb-5 text-left">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export interface ProfileSettingsTemplateProps {
  initialState?: ProfileState;
  onSave?: (state: ProfileState) => void;
  onCancel?: () => void;
  isDarkMode?: boolean;
}

export function ProfileSettingsTemplate({
  initialState = INITIAL_PROFILE,
  onSave,
  onCancel,
  isDarkMode,
}: ProfileSettingsTemplateProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const fid = (s: string) => `${uid}-${s}`;

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof isDarkMode === 'boolean') return isDarkMode;
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('eris_theme');
    if (stored) return stored === 'dark';
    return document.documentElement.classList.contains('dark') || true;
  });

  useEffect(() => {
    if (typeof isDarkMode === 'boolean') {
      setIsDark(isDarkMode);
    }
  }, [isDarkMode]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [baseline, setBaseline] = useState<ProfileState>(initialState);
  const [form, setForm] = useState<ProfileState>(initialState);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileState, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function setField<K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline]
  );

  const initials = useMemo(() => {
    const parts = form.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [form.displayName]);

  const bioLeft = BIO_MAX - form.bio.length;

  // Rehydrate form when initialState changes without clobbering non-empty fields with empty defaults
  useEffect(() => {
    if (initialState) {
      const validUpdates = Object.fromEntries(
        Object.entries(initialState).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      );
      if (Object.keys(validUpdates).length > 0) {
        setBaseline((prev) => ({
          ...prev,
          ...validUpdates,
        }));
        setForm((prev) => ({
          ...prev,
          ...validUpdates,
        }));
      }
    }
  }, [
    initialState.displayName,
    initialState.username,
    initialState.avatarUrl,
    initialState.email,
    initialState.headline,
    initialState.bio,
    initialState.website,
    initialState.timezone,
    initialState.visibility,
    initialState.accent,
    initialState.notifyProduct,
    initialState.notifyMentions,
    initialState.notifyDigest,
  ]);

  // Query dedicated user database and local cache on mount
  useEffect(() => {
    let active = true;

    // 1. Immediately hydrate from localStorage to prevent flash of default
    try {
      const localAvatar = localStorage.getItem('eris_user_avatar');
      const localName = localStorage.getItem('eris_user_display_name');
      const localUsername = localStorage.getItem('eris_username');
      const localHeadline = localStorage.getItem('eris_user_headline');
      const localBio = localStorage.getItem('eris_user_bio');
      const localWebsite = localStorage.getItem('eris_user_website');
      const localTimezone = localStorage.getItem('eris_user_timezone');
      const localAccent = localStorage.getItem('eris_user_accent');

      if (localName || localUsername || localAvatar) {
        const cached: Partial<ProfileState> = {};
        if (localName) cached.displayName = localName;
        if (localUsername) cached.username = localUsername;
        if (localAvatar !== null) cached.avatarUrl = localAvatar;
        if (localHeadline) cached.headline = localHeadline;
        if (localBio) cached.bio = localBio;
        if (localWebsite) cached.website = localWebsite;
        if (localTimezone) cached.timezone = localTimezone as any;
        if (localAccent) cached.accent = localAccent as any;

        setForm((prev) => ({ ...prev, ...cached }));
        setBaseline((prev) => ({ ...prev, ...cached }));
      }
    } catch {}

    async function hydrateProfile() {
      try {
        let token: string | null = null;
        try {
          const raw = localStorage.getItem('eris_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            token = parsed.token || null;
          }
        } catch {}

        const res = await fetch('/api/auth/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          const p = data.profile;
          if (p) {
            const resolved: ProfileState = {
              displayName: p.display_name || p.displayName || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_display_name') : '') || initialState.displayName || '',
              username: p.username || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_username') : '') || initialState.username || '',
              avatarUrl: (p.avatar_url !== undefined && p.avatar_url !== null) ? p.avatar_url : ((typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_avatar') : '') || initialState.avatarUrl || ''),
              headline: p.headline || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_headline') : '') || initialState.headline || '',
              bio: p.bio || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_bio') : '') || initialState.bio || '',
              email: p.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_email') : '') || initialState.email || '',
              website: p.website || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_website') : '') || initialState.website || '',
              timezone: (p.timezone || initialState.timezone || 'Asia/Kolkata') as any,
              visibility: (p.visibility || initialState.visibility || 'members') as any,
              accent: (p.accent || initialState.accent || 'indigo') as any,
              notifyProduct: p.notify_product ?? p.notifyProduct ?? initialState.notifyProduct ?? true,
              notifyMentions: p.notify_mentions ?? p.notifyMentions ?? initialState.notifyMentions ?? true,
              notifyDigest: p.notify_digest ?? p.notifyDigest ?? initialState.notifyDigest ?? false,
            };
            setBaseline(resolved);
            setForm(resolved);
          }
        }
      } catch {}
    }
    hydrateProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const u = form.username.trim();
    if (u === baseline.username) {
      setAvailability("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setAvailability(u.length > 0 ? "invalid" : "idle");
      return;
    }
    setAvailability("checking");
    const t = window.setTimeout(() => {
      setAvailability(TAKEN.has(u) ? "taken" : "available");
    }, 600);
    return () => window.clearTimeout(t);
  }, [form.username, baseline.username]);

  useEffect(() => {
    if (!showToast) return;
    const t = window.setTimeout(() => setShowToast(false), 3800);
    return () => window.clearTimeout(t);
  }, [showToast]);

  function focusFirst(errs: Partial<Record<keyof ProfileState, string>>) {
    const order: [keyof ProfileState, HTMLElement | null][] = [
      ["displayName", nameRef.current],
      ["username", usernameRef.current],
      ["email", emailRef.current],
      ["website", websiteRef.current],
      ["bio", bioRef.current],
    ];
    for (const [key, el] of order) {
      if (errs[key] && el) {
        el.focus();
        break;
      }
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmissionError(null);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSubmissionError("Please correct the invalid fields highlighted below before saving.");
      focusFirst(errs);
      return;
    }
    setSaving(true);

    try {
      if (form.avatarUrl) {
        localStorage.setItem('eris_user_avatar', form.avatarUrl);
      } else {
        localStorage.removeItem('eris_user_avatar');
      }
      localStorage.setItem('eris_user_display_name', form.displayName);
      localStorage.setItem('eris_username', form.username);
      if (form.headline) localStorage.setItem('eris_user_headline', form.headline);
      if (form.bio) localStorage.setItem('eris_user_bio', form.bio);
      if (form.email) localStorage.setItem('eris_user_email', form.email);
      if (form.website) localStorage.setItem('eris_user_website', form.website);
      if (form.timezone) localStorage.setItem('eris_user_timezone', form.timezone);
      if (form.accent) localStorage.setItem('eris_user_accent', form.accent);
    } catch {}

    window.setTimeout(() => {
      setSaving(false);
      setBaseline(form);
      setSavedSuccess(true);
      setShowToast(true);
      onSave?.(form);
      setTimeout(() => setSavedSuccess(false), 6000);
    }, 400);
  }

  function handleReset() {
    setForm(baseline);
    setErrors({});
    setSubmissionError(null);
    setSavedSuccess(false);
    setShowToast(false);
  }

  function onAccentKey(e: ReactKeyboardEvent<HTMLButtonElement>, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (idx + 1) % ACCENT_KEYS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + ACCENT_KEYS.length) % ACCENT_KEYS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ACCENT_KEYS.length - 1;
    else return;
    e.preventDefault();
    setField("accent", ACCENT_KEYS[next]);
    swatchRefs.current[next]?.focus();
  }

  const usernameStatusId = fid("username-status");
  const usernameErrId = fid("username-err");
  const usernameDescribedBy =
    [errors.username ? usernameErrId : null, usernameStatusId]
      .filter(Boolean)
      .join(" ") || undefined;

  const availabilityMessage =
    availability === "checking"
      ? "Checking availability…"
      : availability === "available"
        ? `@${form.username} is available.`
        : availability === "taken"
          ? "That username is already taken."
          : availability === "invalid"
            ? "Use 3–20 lowercase letters, numbers, or underscores."
            : "";

  const activeTz = TIMEZONES.find((t) => t.value === form.timezone);

  return (
    <section
      className={cn(
        "relative w-full max-w-4xl mx-auto my-6 rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-visible backdrop-blur-2xl transition-colors duration-200",
        isDark
          ? "dark border-white/10 bg-[#0B0F17]/90 text-white shadow-black/60"
          : "border-slate-200/90 bg-white/95 text-slate-800 shadow-slate-300/40"
      )}
    >
      <style>{`
        @keyframes fp-spin { to { transform: rotate(360deg); } }
        @keyframes fp-pop {
          0% { transform: scale(.5); opacity: 0; }
          60% { transform: scale(1.12); }
          100% { transform: scale(1); opacity: 1; }
        }
        .fp-spin { animation: fp-spin .8s linear infinite; }
        .fp-pop { animation: fp-pop .28s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .fp-spin, .fp-pop { animation: none !important; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative w-full">
        {/* System Feedback & Alerts */}
        <div className="space-y-3 mb-6">
          {savedSuccess && (
            <Alert variant="success" icon={CheckCircle2} className="animate-in fade-in duration-200">
              <AlertTitle className="text-xs font-semibold uppercase tracking-wider">
                Profile Saved Successfully
              </AlertTitle>
              <AlertDescription className="text-xs">
                Your profile configuration and preferences have been synchronized and persisted across the workspace.
              </AlertDescription>
            </Alert>
          )}

          {submissionError && (
            <Alert variant="destructive" icon={AlertCircle} className="animate-in fade-in duration-200">
              <AlertTitle className="text-xs font-semibold uppercase tracking-wider">
                Action Required
              </AlertTitle>
              <AlertDescription className="text-xs">
                {submissionError}
              </AlertDescription>
            </Alert>
          )}

          {dirty && !savedSuccess && (
            <Alert variant="info" icon={Info} className="animate-in fade-in duration-200">
              <AlertTitle className="text-xs font-semibold uppercase tracking-wider">
                Unsaved Profile Changes
              </AlertTitle>
              <AlertDescription className="text-xs">
                You have unsaved changes in your profile. Click "Save changes" below or in the action bar to persist them.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/15">
              Account
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              Profile settings
            </h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-zinc-600 dark:text-neutral-400">
              Update how you appear across the workspace. Changes are visible once saved.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const syntheticEvent = { preventDefault: () => { } } as FormEvent<HTMLFormElement>;
                handleSubmit(syntheticEvent);
              }}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]"
        >
          {/* live preview */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111520]">
              <div
                className={`h-20 bg-gradient-to-r ${ACCENTS[form.accent].grad}`}
                aria-hidden="true"
              />
              <div className="px-5 pb-5 text-left">
                <div
                  className={`-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-br ${ACCENTS[form.accent].grad} text-2xl font-bold text-white shadow-md ring-4 ring-white dark:ring-[#111520]`}
                  aria-hidden="true"
                >
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <p className="mt-3 truncate text-lg font-semibold text-zinc-900 dark:text-white">
                  {form.displayName || "Your name"}
                </p>
                <p className="truncate text-xs font-mono text-zinc-500 dark:text-neutral-400">
                  @{form.username || "username"}
                </p>
                {form.headline ? (
                  <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-neutral-300">
                    {form.headline}
                  </p>
                ) : null}
                {form.bio ? (
                  <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-zinc-600 dark:text-neutral-400">
                    {form.bio}
                  </p>
                ) : null}

                <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs dark:border-white/10">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-neutral-400">
                    <ClockIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {activeTz ? activeTz.label : form.timezone}
                    </span>
                  </div>
                  {form.website.trim() &&
                    /^https?:\/\//.test(form.website.trim()) ? (
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-neutral-400">
                      <GlobeIcon className="h-4 w-4 shrink-0" />
                      <a
                        href={form.website}
                        target="_blank"
                        rel="noopener"
                        className="truncate rounded text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
                      >
                        {form.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  ) : null}
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:border dark:border-white/10 dark:text-neutral-300">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${form.visibility === "public"
                          ? "bg-emerald-500"
                          : form.visibility === "members"
                            ? "bg-amber-500"
                            : "bg-zinc-400 dark:bg-zinc-500"
                          }`}
                      />
                      {VISIBILITY.find((v) => v.value === form.visibility)?.label}
                    </span>
                  </div>
                </dl>
              </div>
            </div>
            <p className="mt-3 px-1 text-xs text-zinc-500 dark:text-neutral-400 text-left">
              Live preview — this is how your card looks to others.
            </p>
          </aside>

          {/* form fields */}
          <div className="space-y-6 text-left">
            <SectionCard
              title="Public profile"
              description="Your name, handle, and a short bio shown across the workspace."
            >
              <div className="space-y-5">
                {/* Avatar Photo / GIF upload */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    <span>Profile Photo or Animated GIF</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      beta
                    </span>
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-br ${ACCENTS[form.accent].grad} text-xl font-bold text-white shadow-md ring-2 ring-indigo-500/30`}>
                      {form.avatarUrl ? (
                        <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-300 bg-white text-xs font-semibold cursor-pointer hover:bg-zinc-50 transition-colors shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10">
                        <span>Upload Photo / GIF</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          beta
                        </span>
                        <input
                          type="file"
                          accept="image/*,.gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setField("avatarUrl", reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {form.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setField("avatarUrl", "")}
                          className="block text-xs font-medium text-rose-500 hover:text-rose-400 cursor-pointer"
                        >
                          Remove avatar
                        </button>
                      )}
                      <p className="text-[11px] text-zinc-500 dark:text-neutral-400">
                        PNG, JPG, WebP, or animated GIFs accepted.
                      </p>
                    </div>
                  </div>
                </div>

                <TextField
                  id={fid("name")}
                  label="Display name"
                  value={form.displayName}
                  onChange={(v) => setField("displayName", v)}
                  error={errors.displayName}
                  placeholder="e.g. Operator"
                  autoComplete="name"
                  inputRef={nameRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit({ preventDefault: () => { } } as any);
                    }
                  }}
                />

                <div>
                  <label htmlFor={fid("username")} className={labelClass}>
                    Username
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-neutral-500">
                      @
                    </span>
                    <input
                      id={fid("username")}
                      ref={usernameRef}
                      type="text"
                      value={form.username}
                      onChange={(e) =>
                        setField(
                          "username",
                          e.target.value.toLowerCase().replace(/\s+/g, "")
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmit({ preventDefault: () => { } } as any);
                        }
                      }}
                      autoComplete="username"
                      aria-invalid={errors.username ? true : undefined}
                      aria-describedby={usernameDescribedBy}
                      className={cn(inputClass(!!errors.username), "pl-7 pr-10")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {availability === "checking" ? (
                        <Spinner className="h-4 w-4 text-zinc-400" />
                      ) : availability === "available" ? (
                        <CheckIcon className="h-4 w-4 text-emerald-500" />
                      ) : availability === "taken" ||
                        availability === "invalid" ? (
                        <XIcon className="h-4 w-4 text-rose-500" />
                      ) : null}
                    </span>
                  </div>
                  {errors.username ? (
                    <p
                      id={usernameErrId}
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <WarnIcon className="h-3.5 w-3.5 shrink-0" />
                      {errors.username}
                    </p>
                  ) : null}
                  <p
                    id={usernameStatusId}
                    aria-live="polite"
                    className={cn(
                      "mt-1.5 text-xs",
                      availability === "available"
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : availability === "taken" || availability === "invalid"
                          ? "text-rose-600 dark:text-rose-400 font-medium"
                          : "text-zinc-500 dark:text-neutral-400"
                    )}
                  >
                    {availabilityMessage ||
                      "Letters, numbers and underscores. This is your public @handle."}
                  </p>
                </div>

                <TextField
                  id={fid("headline")}
                  label="Headline"
                  value={form.headline}
                  onChange={(v) => setField("headline", v)}
                  placeholder="e.g. System Engineer"
                  hint="A short line shown just under your name."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit({ preventDefault: () => { } } as any);
                    }
                  }}
                />

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label htmlFor={fid("bio")} className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Bio
                    </label>
                    <span
                      aria-live="polite"
                      className={cn(
                        "text-xs tabular-nums",
                        bioLeft < 0
                          ? "font-semibold text-rose-600 dark:text-rose-400"
                          : bioLeft < 20
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-zinc-400 dark:text-neutral-500"
                      )}
                    >
                      {bioLeft} left
                    </span>
                  </div>
                  <textarea
                    id={fid("bio")}
                    ref={bioRef}
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                    aria-invalid={errors.bio ? true : undefined}
                    aria-describedby={errors.bio ? fid("bio-err") : undefined}
                    className={cn(inputClass(!!errors.bio), "resize-y")}
                    placeholder="Tell teammates what you work on."
                  />
                  {errors.bio ? (
                    <p
                      id={fid("bio-err")}
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <WarnIcon className="h-3.5 w-3.5 shrink-0" />
                      {errors.bio}
                    </p>
                  ) : null}
                </div>

                <div>
                  <span className={labelClass} id={fid("accent-label")}>
                    Avatar color
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby={fid("accent-label")}
                    className="flex flex-wrap gap-2.5"
                  >
                    {ACCENT_KEYS.map((key, i) => {
                      const active = form.accent === key;
                      return (
                        <button
                          key={key}
                          ref={(el) => {
                            swatchRefs.current[i] = el;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={ACCENTS[key].label}
                          tabIndex={active ? 0 : -1}
                          onClick={() => setField("accent", key)}
                          onKeyDown={(e) => onAccentKey(e, i)}
                          className={cn(
                            `relative flex h-9 w-9 items-center justify-center rounded-full ${ACCENTS[key].swatch} outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 ${ACCENTS[key].ring} focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0B0F17]`,
                            active
                              ? `ring-2 ring-offset-2 ${ACCENTS[key].ring} ring-offset-white dark:ring-offset-[#0B0F17]`
                              : "ring-1 ring-inset ring-black/10 hover:scale-105 dark:ring-white/20"
                          )}
                        >
                          {active ? (
                            <CheckIcon className="fp-pop h-4 w-4 text-white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Contact"
              description="How teammates and visitors can reach you."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id={fid("email")}
                  label="Verified Account Email"
                  value={form.email || ""}
                  onChange={(v) => setField("email", v)}
                  error={undefined}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="No email linked"
                  inputRef={emailRef}
                  disabled={true}
                  readOnly={true}
                  hint={form.email ? "Email verified" : "Account email (managed by auth provider)"}
                />
                <TextField
                  id={fid("website")}
                  label="Website"
                  value={form.website}
                  onChange={(v) => setField("website", v)}
                  error={errors.website}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com"
                  hint="Optional — shown as a link on your profile."
                  inputRef={websiteRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit({ preventDefault: () => { } } as any);
                    }
                  }}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Visibility & timezone"
              description="Control who can see your profile and how times are shown."
            >
              <div className="space-y-6">
                <fieldset>
                  <legend className={labelClass}>Profile visibility</legend>
                  <div className="grid gap-3">
                    {VISIBILITY.map((opt) => {
                      const active = form.visibility === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                            active
                              ? "border-indigo-400 bg-indigo-50/70 dark:border-indigo-500/60 dark:bg-indigo-500/10"
                              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.01] dark:hover:border-white/20"
                          )}
                        >
                          <input
                            type="radio"
                            name={fid("visibility")}
                            value={opt.value}
                            checked={active}
                            onChange={() => setField("visibility", opt.value)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:peer-focus-visible:ring-offset-zinc-900 ${active
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-zinc-300 dark:border-zinc-600"
                              }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full bg-white transition-opacity ${active ? "opacity-100" : "opacity-0"
                                }`}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                              <span>{opt.label.replace(' (beta)', '')}</span>
                              {opt.value !== 'members' && (
                                <span className="px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                  beta
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-zinc-500 dark:text-neutral-400">
                              {opt.desc}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor={fid("tz")} className={labelClass}>
                    Timezone
                  </label>
                  <div className="relative">
                    <select
                      id={fid("tz")}
                      value={form.timezone}
                      onChange={(e) => setField("timezone", e.target.value)}
                      className={cn(inputClass(false), "cursor-pointer appearance-none pr-10")}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-neutral-500" />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Notifications"
              description="Choose which emails land in your inbox."
            >
              <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                {(
                  [
                    {
                      key: "notifyProduct" as const,
                      title: "Product updates (beta)",
                      desc: "New features and meaningful changes to the platform.",
                    },
                    {
                      key: "notifyMentions" as const,
                      title: "Mentions & replies (beta)",
                      desc: "When someone @mentions you or replies to your comments.",
                    },
                    {
                      key: "notifyDigest" as const,
                      title: "Weekly digest (beta)",
                      desc: "A Monday summary of activity across your workspace.",
                    },
                  ]
                ).map((n) => {
                  const lid = fid(`${n.key}-label`);
                  const did = fid(`${n.key}-desc`);
                  return (
                    <li
                      key={n.key}
                      className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p
                          id={lid}
                          className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white"
                        >
                          <span>{n.title.replace(' (beta)', '')}</span>
                          <span className="px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            beta
                          </span>
                        </p>
                        <p
                          id={did}
                          className="text-xs text-zinc-500 dark:text-neutral-400"
                        >
                          {n.desc}
                        </p>
                      </div>
                      <Toggle
                        checked={form[n.key]}
                        onChange={() => setField(n.key, !form[n.key])}
                        labelId={lid}
                        descId={did}
                      />
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <div className="sticky bottom-4 z-20 flex flex-col items-stretch gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#0e121a]/95 dark:text-white">
              <p
                aria-live="polite"
                className="px-1 text-xs text-zinc-500 dark:text-neutral-400 text-left"
              >
                {dirty ? (
                  <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    You have unsaved changes.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    All changes saved.
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2.5">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!dirty || saving}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {showToast ? (
          <motion.div
            role="status"
            aria-live="polite"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[#0e121a]/95 text-white px-4 py-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:translate-x-0 dark:border-emerald-500/30 dark:bg-zinc-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">
                Profile updated
              </p>
              <p className="text-xs text-neutral-400">
                Your changes are now live for teammates.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default ProfileSettingsTemplate;
