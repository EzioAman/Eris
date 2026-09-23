/**
 * ERIS Asset Preloader & GPU Texture Cache
 * Decodes heavy imagery and background canvas assets during intro/loading
 * to ensure 60fps stutter-free animations when navigating to Onboarding.
 */

const PRELOAD_IMAGES = [
  '/assets/onboarding_background.png',
  '/assets/eris_default.gif',
  '/assets/eris_thinking.svg',
];

const cachedImageMap = new Map<string, HTMLImageElement>();

export function preloadOnboardingAssets(): Promise<void[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);

  const promises = PRELOAD_IMAGES.map((src) => {
    if (cachedImageMap.has(src)) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = src;
      // Pre-decode directly into GPU memory
      if ('decode' in img && typeof img.decode === 'function') {
        img
          .decode()
          .then(() => {
            cachedImageMap.set(src, img);
            resolve();
          })
          .catch(() => {
            cachedImageMap.set(src, img);
            resolve();
          });
      } else {
        img.onload = () => {
          cachedImageMap.set(src, img);
          resolve();
        };
        img.onerror = () => resolve();
      }
    });
  });

  return Promise.all(promises);
}
