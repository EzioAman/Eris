import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Scale, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  isFirstRun?: boolean;
  onConsentAccepted?: () => void;
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  isFirstRun = false,
  onConsentAccepted,
}) => {
  const [activeTab, setActiveTab] = useState<'consent' | 'privacy' | 'terms' | 'license'>(
    isFirstRun ? 'consent' : 'privacy'
  );
  const [hasConfirmedAge, setHasConfirmedAge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isFirstRun) {
      setActiveTab('consent');
    }
  }, [isFirstRun]);

  if (!isOpen) return null;

  const handleAcceptConsent = async () => {
    setIsSubmitting(true);
    const consentPayload = {
      agreed: true,
      age_confirmed: true,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    // 1. Persist in local storage
    try {
      localStorage.setItem('eris_informed_consent_v1', JSON.stringify(consentPayload));
    } catch {
      // ignore
    }

    // 2. Persist in local SQLite database / memory store via backend
    try {
      await fetch('/api/system/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consentPayload),
      });
    } catch {
      // Resilient local fallback: already stored in localStorage
    }

    setIsSubmitting(false);
    if (onConsentAccepted) {
      onConsentAccepted();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'w-full max-w-4xl lg:max-w-5xl h-[88vh] max-h-[92vh] rounded-3xl border flex flex-col overflow-hidden dashboard-modal-glow',
            isDarkMode
              ? 'bg-[#0B0F19] border-violet-500/30 text-neutral-100'
              : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isDarkMode ? "border-white/10" : "border-slate-200"
          )}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  {isFirstRun ? 'ERIS Workstation • Age Gate & Operational Consent' : 'Legal, Privacy & Licensing Notice'}
                </h2>
                <p className={cn("text-xs font-medium", isDarkMode ? "text-neutral-400" : "text-slate-600")}>
                  Open source, local-first AI architecture
                </p>
              </div>
            </div>

            {!isFirstRun && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isDarkMode ? "text-neutral-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className={cn(
            "flex items-center gap-1 px-6 pt-2.5 pb-0 border-b text-xs font-medium overflow-x-auto",
            isDarkMode ? "border-white/10" : "border-slate-200"
          )}>
            {isFirstRun && (
              <button
                type="button"
                onClick={() => setActiveTab('consent')}
                className={cn(
                  'pb-2 px-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0',
                  activeTab === 'consent'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
                    : isDarkMode
                    ? 'border-transparent text-neutral-400 hover:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Informed Consent</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={cn(
                'pb-2 px-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0',
                activeTab === 'privacy'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
                  : isDarkMode
                  ? 'border-transparent text-neutral-400 hover:text-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy &amp; 18+</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={cn(
                'pb-2 px-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0',
                activeTab === 'terms'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
                  : isDarkMode
                  ? 'border-transparent text-neutral-400 hover:text-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms &amp; Zero Liability</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('license')}
              className={cn(
                'pb-2 px-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0',
                activeTab === 'license'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
                  : isDarkMode
                  ? 'border-transparent text-neutral-400 hover:text-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Apache 2.0</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className={cn(
            "flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-xs sm:text-sm leading-relaxed",
            isDarkMode ? "text-neutral-200" : "text-slate-800"
          )}>
            {activeTab === 'consent' && (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border space-y-2",
                  isDarkMode ? "border-violet-500/20 bg-violet-500/5 text-neutral-200" : "border-violet-600/30 bg-violet-50 text-slate-900"
                )}>
                  <h3 className={cn("font-bold text-sm flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-950")}>
                    <Shield className="w-4 h-4 text-violet-400" />
                    First-Run Operational &amp; Legal Acknowledgement
                  </h3>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-700")}>
                    ERIS is an experimental, autonomous workstation distributed under the Apache 2.0 open source license. Before utilizing automated tools or connecting models, please review and confirm the core operational principles:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className={cn("p-3.5 rounded-xl border space-y-1", isDarkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-300 bg-slate-50")}>
                    <div className={cn("flex items-center gap-2 font-bold", isDarkMode ? "text-white" : "text-slate-950")}>
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1. Age of Majority (18+)</span>
                    </div>
                    <p className={isDarkMode ? "text-neutral-300 text-[11px]" : "text-slate-700 text-[11px]"}>
                      You must be at least 18 years of age (or legal age of majority in your jurisdiction) to run ERIS. Minors may only operate under direct parental responsibility.
                    </p>
                  </div>

                  <div className={cn("p-3.5 rounded-xl border space-y-1", isDarkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-300 bg-slate-50")}>
                    <div className={cn("flex items-center gap-2 font-bold", isDarkMode ? "text-white" : "text-slate-950")}>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. Autonomous Tool Actions</span>
                    </div>
                    <p className={isDarkMode ? "text-neutral-300 text-[11px]" : "text-slate-700 text-[11px]"}>
                      ERIS can execute terminal commands, edit local files, and invoke APIs. You are the sole Human-in-the-Loop supervisor and assume all operational risk.
                    </p>
                  </div>

                  <div className={cn("p-3.5 rounded-xl border space-y-1", isDarkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-300 bg-slate-50")}>
                    <div className={cn("flex items-center gap-2 font-bold", isDarkMode ? "text-white" : "text-slate-950")}>
                      <Scale className="w-3.5 h-3.5 text-indigo-400" />
                      <span>3. Complete Hold-Harmless</span>
                    </div>
                    <p className={isDarkMode ? "text-neutral-300 text-[11px]" : "text-slate-700 text-[11px]"}>
                      Developer Aman Sinha and contributors bear zero liability for data loss, system crashes, or third-party API costs to the maximum extent permitted by law.
                    </p>
                  </div>

                  <div className={cn("p-3.5 rounded-xl border space-y-1", isDarkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-300 bg-slate-50")}>
                    <div className={cn("flex items-center gap-2 font-bold", isDarkMode ? "text-white" : "text-slate-950")}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>4. Local Privacy</span>
                    </div>
                    <p className={isDarkMode ? "text-neutral-300 text-xs" : "text-slate-700 text-xs"}>
                      No remote tracking or analytics. Your verification proof is recorded strictly on your local device.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className={cn(
                    "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-colors",
                    isDarkMode ? "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10" : "border-violet-600/30 bg-violet-50 hover:bg-violet-100/70"
                  )}>
                    <input
                      type="checkbox"
                      checked={hasConfirmedAge}
                      onChange={(e) => setHasConfirmedAge(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-600 text-violet-600 focus:ring-violet-500 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span className={cn("text-xs font-semibold leading-relaxed", isDarkMode ? "text-neutral-200" : "text-slate-900")}>
                      I confirm that I am 18+ years of age, accept the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('terms');
                        }}
                        className="underline font-bold text-violet-600 dark:text-violet-400 hover:opacity-80"
                      >
                        Terms of Service
                      </button>
                      {' '}&amp;{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('privacy');
                        }}
                        className="underline font-bold text-violet-600 dark:text-violet-400 hover:opacity-80"
                      >
                        Privacy Policy
                      </button>
                      , and agree to hold Developer Aman Sinha harmless from all autonomous actions.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <div className={cn(
                  "p-4 rounded-xl border space-y-1.5",
                  isDarkMode ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-600/40 bg-emerald-50 text-emerald-950"
                )}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Zero Server-Side Data Collection</span>
                  </div>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-emerald-200" : "text-emerald-900 font-medium")}>
                    ERIS does not maintain central servers, remote analytics beacons, or prompt logs. All databases (auth.db, rag_vault.db), credentials, and chat histories reside strictly on your local disk.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    1. Age of Majority &amp; 18+ Requirement
                  </h3>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    ERIS is an advanced autonomous developer workstation capable of executing shell commands and modifying files. <strong className={isDarkMode ? "text-white font-semibold" : "text-slate-950 font-bold"}>You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to install or use this software.</strong>
                  </p>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    Minors under the age of majority may only operate ERIS under the active supervision and legal responsibility of a parent or guardian.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    2. Local Informed Consent Verification
                  </h3>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    To maintain legal non-repudiation while respecting your local device privacy, confirmation of majority age and acceptance of terms is recorded strictly in your local encrypted database (<code className={cn("font-mono font-semibold px-1 rounded", isDarkMode ? "bg-white/10 text-cyan-300" : "bg-slate-200 text-slate-900")}>auth.db</code>). This proof is never sent to developer servers.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    3. Direct Third-Party LLM Connections (BYOK)
                  </h3>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    When using cloud models (Google Gemini, OpenRouter, Groq, OpenAI), your device establishes direct, encrypted HTTPS connections to third-party endpoints using your own API keys. No data passes through developer servers.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    4. Data Ownership &amp; Permanent Deletion
                  </h3>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    You retain full control over your data. Purging local files or clicking <strong className={isDarkMode ? "text-white" : "text-slate-950"}>Settings &gt; Clear All Local Data</strong> destroys all memory and credentials with zero cloud residue.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-5">
                <div className={cn(
                  "p-4 rounded-xl border space-y-1.5",
                  isDarkMode ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-600/40 bg-amber-50 text-amber-950"
                )}>
                  <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    Experimental Software &amp; Autonomous Assumption of Risk
                  </h4>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-amber-200" : "text-amber-900 font-medium")}>
                    ERIS is under active development. You are the sole human supervisor (Human-in-the-Loop) and assume 100% responsibility for evaluating and approving any commands or actions executed by the agent on your machine.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    1. Zero Developer Liability &amp; Complete Hold-Harmless
                  </h3>
                  <p className={cn(
                    "font-mono text-[11px] uppercase tracking-wide leading-relaxed p-3.5 rounded-xl border",
                    isDarkMode ? "bg-white/[0.03] border-white/10 text-neutral-200" : "bg-slate-100 border-slate-300 text-slate-900 font-semibold"
                  )}>
                    IN NO EVENT SHALL DEVELOPER AMAN SINHA OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES WHATSOEVER (INCLUDING LOSS OF DATA, SYSTEM CRASHES, REPOSITORY CORRUPTION, OR THIRD-PARTY API BILLING CHARGES) ARISING OUT OF THE USE OR INABILITY TO USE ERIS.
                  </p>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800 font-medium")}>
                    By operating ERIS, you agree to defend, indemnify, and hold harmless Developer Aman Sinha from all claims or losses resulting from actions run on your system.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("font-bold text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-950")}>
                    2. Third-Party Costs &amp; BYOK
                  </h3>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-neutral-300" : "text-slate-800")}>
                    You supply your own API keys and are solely responsible for token consumption costs, rate limits, and compliance with external provider terms.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'license' && (
              <div className="space-y-4 font-mono text-xs">
                <p className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-950")}>Apache License, Version 2.0</p>
                <p className={isDarkMode ? "text-neutral-300" : "text-slate-700 font-medium"}>Copyright (c) 2026 Aman Sinha and ERIS Contributors</p>
                <div className={cn(
                  "p-4 rounded-xl border leading-relaxed overflow-x-auto text-[11px]",
                  isDarkMode ? "bg-black/50 border-white/10 text-neutral-200" : "bg-slate-100 border-slate-300 text-slate-900 font-medium"
                )}>
                  {`Unless required by applicable law or agreed to in writing, Licensor provides the Work on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including without limitation warranties of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE.

In no event shall any Contributor be liable for damages, including any direct, indirect, special, incidental, or consequential damages arising out of the use or inability to use the Work.`}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-inherit bg-black/5 dark:bg-black/20 text-xs">
            <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
              {isFirstRun ? 'Proof of consent stored locally on device' : 'Complete texts in TERMS_OF_SERVICE.md'}
            </span>

            <div className="flex items-center gap-2">
              {isFirstRun ? (
                <button
                  type="button"
                  disabled={!hasConfirmedAge || isSubmitting}
                  onClick={handleAcceptConsent}
                  className={cn(
                    'px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-xs',
                    hasConfirmedAge && !isSubmitting
                      ? 'bg-violet-600 hover:bg-violet-500'
                      : 'bg-neutral-700 opacity-50 cursor-not-allowed'
                  )}
                >
                  <span>I Confirm 18+ &amp; Enter ERIS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LegalTermsModal;

