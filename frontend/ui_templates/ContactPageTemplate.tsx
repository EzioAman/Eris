import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, ArrowLeft, Send, CheckCircle2, Sparkles, X, Heart } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface ContactPageTemplateProps {
  onClose?: () => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  className?: string;
}

export const ContactPageTemplate: React.FC<ContactPageTemplateProps> = ({
  onClose,
  onBack,
  isDarkMode = true,
  className,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    topic: 'General Inquiry',
    message: '',
    agreePrivacy: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const topics = [
    'General Inquiry',
    'Feature Request',
    'Bug Report',
    'Security Disclosure',
    'Collaboration',
  ];

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsSubmitted(true);
      } else {
        setSubmitError(data.detail || data.message || 'Failed to dispatch message.');
      }
    } catch {
      setSubmitError('Unable to reach server. Please ensure backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-9 border shadow-2xl relative z-10 font-sans',
        isDarkMode
          ? 'bg-[#0B0F17] border-white/10 text-white shadow-black/80'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60',
        className
      )}
    >
      {/* Top Header Buttons */}
      <div className="flex items-center justify-between mb-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border',
              isDarkMode
                ? 'border-white/10 text-neutral-300 hover:text-white hover:bg-white/5'
                : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Team</span>
          </button>
        ) : (
          <div />
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl transition-colors cursor-pointer',
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hero Section (Untitled UI Style) */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          Contact & Direct Line
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          We&apos;d love to hear from you
        </h2>
        <p className={cn('text-sm mt-2 leading-relaxed', isDarkMode ? 'text-neutral-400' : 'text-slate-600')}>
          Have an idea, need assistance, found a security flaw, or want to discuss autonomous agent architecture? Send a direct dispatch.
        </p>
      </div>

      {/* 3 Quick Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Email Card */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-indigo-500/30',
            isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Email Directly</h4>
            <p className={cn('text-xs mt-1', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
              Creator & Official Support
            </p>
          </div>
          <div className="mt-2 space-y-1">
            <a
              href="mailto:sinhadeep2409@gmail.com"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 truncate block"
              title="Creator Email"
            >
              sinhadeep2409@gmail.com
            </a>
            <a
              href="mailto:eris.ai.official@gmail.com"
              className="text-[11px] font-medium text-violet-400 hover:text-violet-300 truncate block"
              title="Support Email"
            >
              eris.ai.official@gmail.com
            </a>
          </div>
        </div>

        {/* GitHub Card */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-cyan-500/30',
            isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold">GitHub Repository</h4>
            <p className={cn('text-xs mt-1', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
              Issues, PRs, and stars
            </p>
          </div>
          <a
            href="https://github.com/EzioAman/Eris"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 mt-3 truncate block"
          >
            github.com/EzioAman/Eris
          </a>
        </div>

        {/* Community / Live Chat Card */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-emerald-500/30',
            isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Live AI Chat</h4>
            <p className={cn('text-xs mt-1', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
              Talk to ERIS
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-400 mt-3 block">
            Inside ERIS Workspace
          </span>
        </div>
      </div>

      {/* Main Contact Form Card */}
      <div
        className={cn(
          'rounded-2xl p-6 sm:p-8 border shadow-lg relative overflow-hidden',
          isDarkMode ? 'bg-[#0E1320] border-white/10' : 'bg-slate-50 border-slate-200'
        )}
      >
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center space-y-4"
            >
              <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Message Dispatched Successfully!</h3>
              <p className={cn('text-xs sm:text-sm max-w-md mx-auto', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
                Thank you for reaching out. Your dispatch has been securely recorded in local audit memory. Aman will review your note shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    topic: 'General Inquiry',
                    message: '',
                    agreePrivacy: true,
                  });
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Send Another Message
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-neutral-400">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-xs font-sans outline-none border transition-colors',
                      isDarkMode
                        ? 'bg-black/50 border-white/10 text-white focus:border-indigo-500 placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-neutral-400">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mercer"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-xs font-sans outline-none border transition-colors',
                      isDarkMode
                        ? 'bg-black/50 border-white/10 text-white focus:border-indigo-500 placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-neutral-400">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-xs font-sans outline-none border transition-colors',
                    isDarkMode
                      ? 'bg-black/50 border-white/10 text-white focus:border-indigo-500 placeholder-neutral-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                  )}
                />
              </div>

              {/* Topic Selector Chips */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-neutral-400">
                  What is this regarding?
                </label>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, topic: t })}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border',
                        formData.topic === t
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : isDarkMode
                            ? 'bg-black/40 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-neutral-400">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Leave your thoughts, questions, or bug details here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-xs font-sans outline-none border transition-colors resize-none',
                    isDarkMode
                      ? 'bg-black/50 border-white/10 text-white focus:border-indigo-500 placeholder-neutral-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                  )}
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <span className="text-[11px] text-neutral-400 flex items-center gap-1.5 order-2 sm:order-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-400" />
                  Your note reaches the developer directly & sends a receipt to your email.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'order-1 sm:order-2 cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50',
                    isDarkMode
                      ? 'border border-white/15 bg-[#121622] hover:bg-[#1A2030] hover:border-white/30 text-white shadow-black/40'
                      : 'border border-slate-300 bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300/50'
                  )}
                >
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isSubmitting ? 'Dispatching Message...' : 'Send Message'}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ContactPageTemplate;
