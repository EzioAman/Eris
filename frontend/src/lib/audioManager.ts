// ERIS Audio System Manager
// Handles ambient background audio and UI sound cues

type AudioListener = (isMuted: boolean) => void;

class AudioManager {
  private ambientAudio: HTMLAudioElement | null = null;
  private errorAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private listeners: Set<AudioListener> = new Set();
  private initialized: boolean = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('eris_audio_muted');
      this.isMuted = storedMute === 'true';
    }
  }

  private init() {
    if (this.initialized || typeof window === 'undefined') return;

    // 1. Ambient track: Low volume (0.18), loopable
    const ambientSrc = '/assets/audio/ambient_intro.mp3';
    this.ambientAudio = new Audio(ambientSrc);
    this.ambientAudio.loop = true;
    this.ambientAudio.volume = this.isMuted ? 0 : 0.18;

    // Fallback if clean name fails
    this.ambientAudio.addEventListener('error', () => {
      const fallbackSrc = encodeURI('/assets/audio/ambient music when app starts with low volume and mute option.mp3');
      if (this.ambientAudio && this.ambientAudio.src !== fallbackSrc) {
        this.ambientAudio.src = fallbackSrc;
        if (!this.isMuted) this.ambientAudio.play().catch(() => {});
      }
    }, { once: true });

    // 2. Error cue
    const errorSrc = '/assets/audio/error.mp3';
    this.errorAudio = new Audio(errorSrc);
    this.errorAudio.volume = this.isMuted ? 0 : 0.35;

    this.initialized = true;
  }

  public playAmbient() {
    this.init();
    if (!this.ambientAudio) return;

    this.ambientAudio.volume = this.isMuted ? 0 : 0.18;
    this.ambientAudio.play().catch(() => {
      // Browser autoplay policy requires user gesture; will play on first interaction
      const resumeOnGesture = () => {
        if (this.ambientAudio && !this.isMuted) {
          this.ambientAudio.play().catch(() => {});
        }
        window.removeEventListener('click', resumeOnGesture);
        window.removeEventListener('keydown', resumeOnGesture);
      };
      window.addEventListener('click', resumeOnGesture, { once: true });
      window.addEventListener('keydown', resumeOnGesture, { once: true });
    });
  }

  public playError() {
    this.init();
    if (!this.errorAudio || this.isMuted) return;

    this.errorAudio.currentTime = 0;
    this.errorAudio.volume = 0.35;
    this.errorAudio.play().catch(() => {});
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('eris_audio_muted', String(this.isMuted));

    if (this.ambientAudio) {
      this.ambientAudio.volume = this.isMuted ? 0 : 0.18;
      if (!this.isMuted && this.ambientAudio.paused) {
        this.ambientAudio.play().catch(() => {});
      }
    }

    this.notify();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.isMuted));
  }
}

export const erisAudio = new AudioManager();
