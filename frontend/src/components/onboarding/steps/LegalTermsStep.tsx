import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { FileText, ShieldCheck, AlertCircle } from 'lucide-react';

export interface LegalTermsStepProps {
  initialTab?: 'tos' | 'privacy';
  onAccept?: () => void;
  onBack?: () => void;
}

type TabType = 'tos' | 'privacy' | 'license';

export const LegalTermsStep: React.FC<LegalTermsStepProps> = ({
  initialTab = 'tos',
  onAccept,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [ageConfirmed, setAgeConfirmed] = useState(true);
  const [tosChecked, setTosChecked] = useState(true);
  const [privacyChecked, setPrivacyChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!ageConfirmed) {
      setError('You must confirm you are at least 18 years of age (or legal age of majority) to proceed.');
      return;
    }
    if (!tosChecked || !privacyChecked) {
      setError('You must acknowledge the Terms of Service, Disclaimer, and Privacy Policy to proceed.');
      return;
    }
    setError(null);

    // Persist informed consent record locally and to backend
    try {
      const consentPayload = {
        agreed: true,
        age_confirmed: true,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('eris_informed_consent_v1', JSON.stringify(consentPayload));
      fetch('/api/system/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consentPayload),
      }).catch(() => {});
    } catch {
      // ignore
    }

    onAccept?.();
  };

  return (
    <div className="w-full max-w-full mx-auto animate-in fade-in zoom-in-95 duration-300 font-sans">
      <Card className="w-full border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col max-h-[88vh]">
        <CardHeader className="space-y-1 text-center p-0 pb-3 shrink-0">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Terms of Service &amp; Privacy Policy
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-neutral-400 font-light font-sans">
            Review the ERIS terms of service, autonomous disclaimer, and privacy policy
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-3.5 p-0 overflow-hidden">
          {error && (
            <Alert variant="destructive" icon={AlertCircle} className="text-left shrink-0 font-sans">
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tab Navigation */}
          <div className="flex rounded-xl bg-black/40 border border-white/10 p-1 shrink-0 font-sans">
            <button
              type="button"
              onClick={() => setActiveTab('tos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'tos'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service &amp; Disclaimer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Privacy Policy &amp; 18+
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('license')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'license'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Apache 2.0
            </button>
          </div>

          {/* Document Content Viewer */}
          <div className="flex-1 min-h-[160px] max-h-[44vh] overflow-y-auto overscroll-contain rounded-xl bg-black/40 border border-white/10 p-4 text-left text-xs text-neutral-300 leading-relaxed font-mono">
            {activeTab === 'tos' && (
              <div className="space-y-3">
                <h4 className="font-sans font-bold text-white text-sm">1. Experimental Software &amp; Autonomous Operation</h4>
                <p>ERIS is free and open-source experimental software under active development. You acknowledge that ERIS uses probabilistic LLMs capable of issuing system commands and editing code. You act as the sole Human-in-the-Loop supervisor with 100% responsibility for evaluating and approving actions.</p>
                <h4 className="font-sans font-bold text-white text-sm">2. Complete Zero Developer Liability &amp; Hold-Harmless</h4>
                <p className="uppercase text-[11px] text-neutral-400">IN NO EVENT SHALL DEVELOPER AMAN SINHA OR CONTRIBUTORS BE LIABLE FOR ANY DAMAGES WHATSOEVER (INCLUDING LOSS OF DATA, SYSTEM DAMAGE, REPOSITORY CORRUPTION, OR THIRD-PARTY API CHARGES). YOU AGREE TO DEFEND, INDEMNIFY, AND HOLD HARMLESS DEVELOPER AMAN SINHA FROM ALL CLAIMS.</p>
                <h4 className="font-sans font-bold text-white text-sm">3. Bring Your Own Keys (BYOK) &amp; Third-Party Costs</h4>
                <p>You supply your own API keys directly to model providers. You are solely liable for token consumption fees and provider terms.</p>
                <h4 className="font-sans font-bold text-white text-sm">4. Jurisdictional Severability &amp; Golden Savings Clause</h4>
                <p>To the maximum extent permitted by applicable law, nothing herein excludes liability which cannot be lawfully excluded under applicable national law.</p>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-3">
                <h4 className="font-sans font-bold text-white text-sm">1. Mandatory 18+ Age of Majority Requirement</h4>
                <p>You must be at least 18 years of age (or legal age of majority in your jurisdiction) to run ERIS. Minors under the age of majority may only operate ERIS under the direct legal responsibility of a parent or guardian.</p>
                <h4 className="font-sans font-bold text-white text-sm">2. Local Storage &amp; Privacy</h4>
                <p>ERIS operates entirely on your local machine with no remote tracking, analytics, or central servers. All databases (auth.db, rag_vault.db) and API keys remain encrypted on your device.</p>
                <h4 className="font-sans font-bold text-white text-sm">3. Local Informed Consent Verification Proof</h4>
                <p>Proof of majority confirmation and informed consent is recorded strictly within your local encrypted database (auth.db) and local system storage. It is never transmitted to Developer Aman Sinha or any third party.</p>
                <h4 className="font-sans font-bold text-white text-sm">4. Direct-to-Provider LLM Communications</h4>
                <p>API requests connect directly and securely from your computer to external model providers via HTTPS. No prompt passes through developer infrastructure.</p>
              </div>
            )}

            {activeTab === 'license' && (
              <div className="space-y-3 font-mono text-[11px]">
                <h4 className="font-sans font-bold text-white text-sm">Apache License, Version 2.0</h4>
                <p className="text-neutral-400">Copyright (c) 2026 Aman Sinha and ERIS Contributors</p>
                <p>Licensed under the Apache License, Version 2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.</p>
                <p>In no event shall any Contributor be liable for damages, including any direct, indirect, special, incidental, or consequential damages arising out of the use or inability to use the Work.</p>
                <p>See the complete LICENSE file in the repository root for full legal terms.</p>
              </div>
            )}
          </div>

          {/* Acceptance Checkboxes */}
          <div className="flex flex-col gap-2 pt-1 text-left shrink-0">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
              />
              <span>I confirm I am <strong className="text-white">18 years of age or older</strong> (or legal age of majority in my jurisdiction).</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={(e) => setTosChecked(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
              />
              <span>I acknowledge and accept the <strong className="text-white">Terms of Service, Zero Liability &amp; Disclaimer</strong>.</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
              />
              <span>I acknowledge and accept the <strong className="text-white">Privacy Policy &amp; Local Storage</strong>.</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 shrink-0">
            <Button
              type="button"
              onClick={handleAccept}
              className="w-full"
            >
              Accept &amp; Continue
            </Button>
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-neutral-400 hover:text-white"
              >
                Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalTermsStep;
