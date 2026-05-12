import confetti from 'canvas-confetti';

/**
 * Celebrate completion of a shopping list with a mid-intensity confetti burst.
 * Fires multiple bursts from two origins over ~2.5 seconds.
 * No-op if called on server (SSR guard) or if the document is not visible.
 */
export function celebrateShoppingComplete() {
  if (typeof window === 'undefined') return;
  // Skip if tab is backgrounded — user isn't looking
  if (typeof document !== 'undefined' && document.hidden) return;

  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ['#EC4899', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  const burst = () => {
    if (Date.now() > end) return;
    // Left side burst
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      startVelocity: 45,
      origin: { x: 0, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    // Right side burst
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      startVelocity: 45,
      origin: { x: 1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    requestAnimationFrame(burst);
  };

  burst();
}

/**
 * Celebrate completion of a project cluster with a short, gentle confetti burst.
 * Shorter and softer than celebrateShoppingComplete because cluster-complete
 * happens more frequently than finishing a whole shopping list.
 * No-op if called on server (SSR guard) or if the document is not visible.
 */
export function celebrateClusterComplete() {
  if (typeof window === 'undefined') return;
  if (typeof document !== 'undefined' && document.hidden) return;

  const duration = 1500;
  const end = Date.now() + duration;
  const colors = ['#EC4899', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  const burst = () => {
    if (Date.now() > end) return;
    confetti({
      particleCount: 4,
      angle: 90,
      spread: 70,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });
    requestAnimationFrame(burst);
  };

  burst();
}

/**
 * Celebrate completion of an entire project with a large, sustained confetti burst.
 * Larger and longer than celebrateClusterComplete and celebrateShoppingComplete
 * because finishing a whole project is rarer and more significant.
 * No-op if called on server (SSR guard) or if the document is not visible.
 */
export function celebrateProjectComplete() {
  if (typeof window === 'undefined') return;
  if (typeof document !== 'undefined' && document.hidden) return;

  const duration = 3500;
  const end = Date.now() + duration;
  const colors = ['#EC4899', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  const burst = () => {
    if (Date.now() > end) return;
    // Left side burst
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 60,
      startVelocity: 45,
      origin: { x: 0.1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    // Center burst
    confetti({
      particleCount: 7,
      angle: 90,
      spread: 100,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.85 },
      colors,
      disableForReducedMotion: true,
    });
    // Right side burst
    confetti({
      particleCount: 7,
      angle: 120,
      spread: 60,
      startVelocity: 45,
      origin: { x: 0.9, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    requestAnimationFrame(burst);
  };

  burst();
}
