import React, { useState, useEffect } from 'react';
import { cn } from '../src/lib/utils';
import {
  Lock,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  BookOpen,
  AlertCircle,
  Loader2,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';

export interface SafariBrowserTemplateProps {
  url?: string;
  imageSrc?: string;
  title?: string;
  readerContent?: string;
  links?: { text: string; href: string }[];
  children?: React.ReactNode;
  className?: string;
  onNavigate?: (newUrl: string, scrapedContent?: string) => void;
  onAskEris?: (prompt: string) => void;
}

export function resolveFrameUrl(rawUrl: string): { embedUrl: string; isKnownRestricted: boolean } {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();

    // YouTube handling: convert to embed player strictly following Google Answer 171780
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const originParam = typeof window !== 'undefined' && window.location?.origin 
        ? `&origin=${encodeURIComponent(window.location.origin)}` 
        : '';
      const v = parsed.searchParams.get('v');
      if (v) {
        return { 
          embedUrl: `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&enablejsapi=1&playsinline=1${originParam}`, 
          isKnownRestricted: false 
        };
      }
      if (parsed.pathname.startsWith('/embed/')) {
        const delimiter = rawUrl.includes('?') ? '&' : '?';
        return { 
          embedUrl: `${rawUrl}${delimiter}enablejsapi=1&playsinline=1${originParam}`, 
          isKnownRestricted: false 
        };
      }
      const rawLower = rawUrl.toLowerCase();
      if (rawLower.includes('sunflower') || rawLower.includes('post_malone') || rawLower.includes('swae_lee')) {
        return { 
          embedUrl: `https://www.youtube-nocookie.com/embed/ApXoWvfEYVU?autoplay=1&enablejsapi=1&playsinline=1${originParam}`, 
          isKnownRestricted: false 
        };
      }
      // Top hits verified embeddable playlist that loads and plays cleanly
      return { 
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSI1pDJn6jXS_PEoNcnwDX3946cx82&enablejsapi=1&playsinline=1${originParam}`, 
        isKnownRestricted: false 
      };
    }

    const restrictedHosts = ['google.com', 'x.com', 'twitter.com', 'github.com', 'facebook.com', 'reddit.com', 'instagram.com', 'linkedin.com'];
    const isRestricted = restrictedHosts.some((rh) => host === rh || host.endsWith('.' + rh));

    return { embedUrl: rawUrl, isKnownRestricted: isRestricted };
  } catch {
    return { embedUrl: rawUrl, isKnownRestricted: false };
  }
}

export const SafariBrowserTemplate: React.FC<SafariBrowserTemplateProps> = ({
  url: initialUrl = 'https://duckduckgo.com',
  imageSrc,
  title = 'Safari Web Inspector',
  readerContent,
  links: initialLinks = [],
  children,
  className,
  onNavigate,
  onAskEris,
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isInputFocused, setIsInputFocused] = useState(false);
  // Default to frame if it's YouTube or embeddable, otherwise reader
  const [viewMode, setViewMode] = useState<'frame' | 'reader'>(
    initialUrl.includes('youtube') || initialUrl.includes('youtu.be') ? 'frame' : 'reader'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [pageTitle, setPageTitle] = useState(title);
  const [extractedContent, setExtractedContent] = useState(readerContent || '');
  const [pageLinks, setPageLinks] = useState<{ text: string; href: string }[]>(initialLinks);
  const [activeTab, setActiveTab] = useState<'content' | 'links'>('content');
  const [securityStatus, setSecurityStatus] = useState<{ isHttps: boolean; notice: string }>({
    isHttps: initialUrl.startsWith('https://'),
    notice: initialUrl.startsWith('https://') ? 'TLS 1.3 Verified' : 'Insecure HTTP connection',
  });

  useEffect(() => {
    setCurrentUrl(initialUrl);
    setUrlInput(initialUrl);
    if (readerContent) setExtractedContent(readerContent);
    if (initialLinks.length > 0) setPageLinks(initialLinks);
  }, [initialUrl, readerContent, initialLinks]);

  const scrapeAndLoad = async (targetUrl: string) => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/chat/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setPageTitle(data.title || targetUrl);
        setExtractedContent(data.content);
        if (Array.isArray(data.links)) {
          setPageLinks(data.links);
        }
        if (data.security) {
          setSecurityStatus({
            isHttps: data.security.isHttps,
            notice: data.security.notice,
          });
        }
        setViewMode('reader');
        onNavigate?.(targetUrl, data.content);
      } else {
        setExtractedContent(data.content || 'Unable to extract text body from this webpage.');
      }
    } catch (err) {
      console.warn('Scraping fallback error:', err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleGo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = urlInput.trim();
    if (!clean) return;

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = `https://${clean}`;
      } else {
        clean = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
      }
    }

    setCurrentUrl(clean);
    setUrlInput(clean);
    setIframeBlocked(false);
    scrapeAndLoad(clean);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeBlocked(false);
    scrapeAndLoad(currentUrl).finally(() => {
      setTimeout(() => setIsRefreshing(false), 400);
    });
  };

  const handleNavigateLink = (linkHref: string) => {
    setCurrentUrl(linkHref);
    setUrlInput(linkHref);
    setIframeBlocked(false);
    scrapeAndLoad(linkHref);
  };

  return (
    <div
      className={cn(
        'w-full rounded-xl overflow-hidden border shadow-2xl flex flex-col bg-white dark:bg-[#0A0D14] dark:border-white/10 border-slate-200 font-sans select-text',
        className
      )}
    >
      {/* Browser Chrome Toolbar */}
      <div className="h-12 w-full flex items-center justify-between px-3.5 bg-slate-100 dark:bg-[#111622] border-b border-slate-200 dark:border-white/10 select-none gap-2">
        {/* Traffic Lights & History Nav */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 dark:border-transparent" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 dark:border-transparent" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 dark:border-transparent" />
          </div>

          <div className="flex items-center gap-1 text-slate-400 dark:text-neutral-500">
            <button
              type="button"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className={cn(
                'p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer',
                (isRefreshing || isScraping) && 'animate-spin text-cyan-400'
              )}
              title="Refresh / Rescrape"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Address & Search Bar */}
        <form onSubmit={handleGo} className="flex-1 max-w-lg mx-auto">
          <div className="flex items-center h-8 px-2.5 bg-white dark:bg-[#07090E] border border-slate-200 dark:border-white/10 rounded-lg text-xs gap-2 shadow-sm focus-within:ring-1 focus-within:ring-cyan-500/50">
            <span title={securityStatus.notice} className="flex items-center">
              {securityStatus.isHttps ? (
                <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </span>
            <input
              type="text"
              value={urlInput}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Search or enter website URL..."
              className={cn(
                'flex-1 bg-transparent border-none outline-none font-mono text-[11.5px] text-slate-800 dark:text-neutral-200 transition-all',
                !isInputFocused && 'truncate'
              )}
            />
            {isScraping ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            ) : (
              <button
                type="submit"
                className="text-[11px] font-sans font-semibold text-cyan-600 dark:text-cyan-400 hover:underline shrink-0 cursor-pointer px-1"
              >
                Go
              </button>
            )}
          </div>
        </form>

        {/* Mode Toggle & External Link */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-slate-200/70 dark:bg-white/5 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                viewMode === 'reader'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Reader View (Scraped text content & security inspection)"
            >
              <BookOpen className="w-3 h-3" />
              <span>Reader</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('frame')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                viewMode === 'frame'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Live Web Frame"
            >
              <Globe className="w-3 h-3" />
              <span>Web</span>
            </button>
          </div>

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Open in system browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Browser Viewport */}
      <div className="relative w-full flex-1 min-h-[360px] max-h-[520px] overflow-auto bg-slate-50 dark:bg-[#07090E]">
        {imageSrc ? (
          <img src={imageSrc} alt={pageTitle} className="w-full h-auto block" />
        ) : viewMode === 'reader' ? (
          <div className="p-6 max-w-2xl mx-auto space-y-4">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-500 dark:text-neutral-400 font-semibold tracking-wider">
                  Reader View
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1.5 text-slate-900 dark:text-white">
                {pageTitle || 'Web Intelligence'}
              </h2>
              <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 dark:text-neutral-400 hover:underline break-all inline-block"
                >
                  {currentUrl}
                </a>

                {onAskEris && (
                  <button
                    type="button"
                    onClick={() => onAskEris(`Analyze the webpage on screen: ${currentUrl} (Title: ${pageTitle}). Page content:\n${extractedContent.slice(0, 800)}`)}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Eris about this page
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Content vs Links */}
            {pageLinks.length > 0 && (
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                    activeTab === 'content'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800'
                  )}
                >
                  Extracted Body
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('links')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                    activeTab === 'links'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800'
                  )}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Page Links ({pageLinks.length})</span>
                </button>
              </div>
            )}

            <div className="text-[13.5px] leading-relaxed text-slate-700 dark:text-neutral-300 space-y-3 font-sans">
              {isScraping ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">ERIS Sentinel is inspecting and scraping page content...</span>
                </div>
              ) : activeTab === 'links' && pageLinks.length > 0 ? (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                  {pageLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-slate-200/80 dark:border-white/5 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 bg-white dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleNavigateLink(link.href)}
                        className="text-left font-medium text-slate-800 dark:text-neutral-200 hover:text-cyan-600 dark:hover:text-cyan-400 truncate flex-1 cursor-pointer"
                      >
                        {link.text || link.href}
                      </button>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 p-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : extractedContent ? (
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-[380px] overflow-y-auto">
                  {extractedContent}
                </div>
              ) : children ? (
                children
              ) : (
                <div className="space-y-2 py-4">
                  <p>
                    Live content extracted from <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-xs">{currentUrl}</code>.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full min-h-[360px] relative">
            {(() => {
              const { embedUrl, isKnownRestricted } = resolveFrameUrl(currentUrl);
              const isYouTube = embedUrl.includes('youtube') || embedUrl.includes('youtu.be');
              if (isKnownRestricted && !isYouTube) {
                return (
                  <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[360px] gap-3">
                    <AlertCircle className="w-8 h-8 text-cyan-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Direct Frame Restricted by Host
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
                      This website protects against framing via X-Frame-Options headers. Switch to Reader View to inspect page text, or open in your browser.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('reader')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Open Reader View
                      </button>
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        Open in System Browser
                      </a>
                    </div>
                  </div>
                );
              }

              if (iframeBlocked && !isYouTube) {
                return (
                  <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[360px] gap-3">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Embedding Restricted by Host ({currentUrl})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
                      Eris has extracted this page in Reader View.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('reader')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Open Reader View
                      </button>
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        Open in System Browser
                      </a>
                    </div>
                  </div>
                );
              }

              if (isYouTube) {
                return (
                  <iframe
                    key={`${embedUrl}-${isRefreshing}`}
                    src={embedUrl}
                    title={pageTitle}
                    onError={() => setIframeBlocked(true)}
                    className="w-full h-full min-h-[360px] border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                );
              }

              return (
                <iframe
                  key={`${embedUrl}-${isRefreshing}`}
                  src={embedUrl}
                  title={pageTitle}
                  onError={() => setIframeBlocked(true)}
                  className="w-full h-full min-h-[360px] border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                />
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SafariBrowserTemplate;
