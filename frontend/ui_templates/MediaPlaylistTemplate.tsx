import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../src/lib/utils';
import { Play, Pause, SkipForward, SkipBack, ListVideo, Heart, Tv } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverSrc?: string;
  youtubeId?: string;
  audioSrc?: string;
}

export interface MediaPlaylistTemplateProps {
  playlist: PlaylistItem[];
  className?: string;
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function resolveYoutubeEmbed(track: PlaylistItem): string {
  if (track.youtubeId) {
    return `https://www.youtube-nocookie.com/embed/${track.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1`;
  }
  const fullText = `${track.title} ${track.artist}`.toLowerCase();
  if (fullText.includes('sunflower') || fullText.includes('post malone') || fullText.includes('swae lee')) {
    return 'https://www.youtube-nocookie.com/embed/ApXoWvfEYVU?autoplay=1&enablejsapi=1&playsinline=1';
  }
  if (fullText.includes('lofi') || fullText.includes('chill') || fullText.includes('study')) {
    return 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1&playsinline=1';
  }
  if (fullText.includes('synthwave') || fullText.includes('deep work')) {
    return 'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1&playsinline=1';
  }
  const q = encodeURIComponent(`${track.title} ${track.artist}`);
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${q}&autoplay=1&enablejsapi=1&playsinline=1`;
}

export const MediaPlaylistTemplate: React.FC<MediaPlaylistTemplateProps> = ({
  playlist,
  className,
  autoPlay = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showVideo, setShowVideo] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  if (!playlist || playlist.length === 0) return null;

  const currentTrack = playlist[currentIndex] || playlist[0];
  const embedUrl = resolveYoutubeEmbed(currentTrack);

  const initialDuration = parseDuration(currentTrack.duration) || 162;
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Synchronize duration and timer state when track changes
  useEffect(() => {
    setCurrentSeconds(0);
    const parsed = parseDuration(currentTrack.duration);
    if (parsed > 0) {
      setDurationSeconds(parsed);
    }
    setIsPlaying(autoPlay);
  }, [currentIndex, currentTrack.id, currentTrack.duration, autoPlay]);

  // Real-time YouTube IFrame postMessage synchronization
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'infoDelivery' && data?.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentSeconds(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDurationSeconds(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            setIsPlaying(data.info.playerState === 1);
          }
        }
      } catch {
        // Ignore non-JSON postMessages from other extensions or devtools
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial handshake telling YouTube embed to stream playback progress info
    const handshakeTimer = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(handshakeTimer);
    };
  }, [currentIndex]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextState ? 'playVideo' : 'pauseVideo',
          args: [],
        }),
        '*'
      );
    }
    if (audioRef.current) {
      if (nextState) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  };

  const nextTrack = () => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (durationSeconds <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetSeconds = (clickX / rect.width) * durationSeconds;
    setCurrentSeconds(targetSeconds);

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [targetSeconds, true],
        }),
        '*'
      );
    }
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progressPercent = durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSeconds / durationSeconds) * 100)) : 0;

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-3xl overflow-hidden bg-white dark:bg-[#161b22] border border-slate-300 dark:border-white/10 shadow-2xl font-sans text-slate-800 dark:text-neutral-100',
        className
      )}
    >
      {/* Player Top Section / Screen */}
      <div className="relative aspect-video sm:aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
        {showVideo ? (
          <iframe
            ref={iframeRef}
            key={`${currentTrack.id}-${currentIndex}`}
            src={embedUrl}
            title={currentTrack.title}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : currentTrack.coverSrc ? (
          <img src={currentTrack.coverSrc} alt={currentTrack.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center text-center p-4">
            <span className="text-white/40 font-bold text-6xl select-none mb-2">♪</span>
            <p className="text-white text-sm font-semibold truncate max-w-[80%]">{currentTrack.title}</p>
            <p className="text-white/70 text-xs truncate max-w-[80%]">{currentTrack.artist}</p>
          </div>
        )}

        {/* HTML5 audio fallback if audioSrc present */}
        {currentTrack.audioSrc && (
          <audio
            ref={audioRef}
            src={currentTrack.audioSrc}
            autoPlay={isPlaying}
            controls={false}
            onTimeUpdate={(e) => setCurrentSeconds(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDurationSeconds(e.currentTarget.duration)}
            onEnded={nextTrack}
          />
        )}

        {/* Overlay Controls */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            title={showVideo ? 'Switch to album cover' : 'Switch to video player'}
            className={cn(
              'p-2 rounded-full backdrop-blur-md bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer',
              showVideo && 'bg-indigo-600/80 text-white'
            )}
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowPlaylist(!showPlaylist)}
            title="Toggle playlist"
            className={cn(
              'p-2 rounded-full backdrop-blur-md bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer',
              showPlaylist && 'bg-indigo-600/80 text-white'
            )}
          >
            <ListVideo className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info & Real-time Synchronized Scrubber */}
      <div className="p-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 pr-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5 truncate">
              {currentTrack.title}
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-neutral-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleLike(currentTrack.id)}
            className="cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <Heart
              className={cn(
                'w-5 h-5 transition-colors',
                liked.has(currentTrack.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-neutral-500'
              )}
            />
          </button>
        </div>

        {/* Real-time Interactive Scrubber */}
        <div
          onClick={handleSeek}
          className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full mb-2 overflow-hidden relative cursor-pointer group"
          title="Click to seek"
        >
          <div
            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-150 ease-out group-hover:bg-indigo-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400 mb-5">
          <span>{formatTime(currentSeconds)}</span>
          <span>{durationSeconds > 0 ? formatTime(durationSeconds) : currentTrack.duration}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={prevTrack}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={nextTrack}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      {/* Playlist Drawer */}
      <motion.div
        initial={false}
        animate={{ height: showPlaylist ? 'auto' : 0 }}
        className="overflow-hidden bg-slate-50 dark:bg-[#0c0c0e] border-t border-slate-200 dark:border-white/5"
      >
        <div className="p-3.5 max-h-[200px] overflow-y-auto space-y-1.5">
          {playlist.map((track, idx) => (
            <button
              key={track.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setIsPlaying(true);
              }}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left cursor-pointer',
                idx === currentIndex
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                  : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={cn('text-xs font-mono font-medium', idx === currentIndex ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400')}>
                  {idx + 1}
                </span>
                <div className="truncate">
                  <p className={cn('text-xs font-semibold leading-tight truncate', idx === currentIndex ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-neutral-200')}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-500 truncate">
                    {track.artist}
                  </p>
                </div>
              </div>
              {idx === currentIndex && isPlaying ? (
                <div className="flex gap-0.5 items-end h-3 shrink-0 ml-2">
                  <motion.div animate={{ height: ['40%', '100%', '60%'] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-indigo-500 rounded-full" />
                  <motion.div animate={{ height: ['80%', '30%', '100%'] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-indigo-500 rounded-full" />
                  <motion.div animate={{ height: ['50%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-0.5 bg-indigo-500 rounded-full" />
                </div>
              ) : (
                <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 shrink-0 ml-2">{track.duration}</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MediaPlaylistTemplate;
