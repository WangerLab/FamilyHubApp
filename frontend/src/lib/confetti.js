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
