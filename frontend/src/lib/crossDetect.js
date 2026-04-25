import { detectCategory, DEFAULT_CATEGORY } from '../constants/categories';
import { detectLocation, DEFAULT_MISC_LOCATION } from '../constants/miscLocations';

/**
 * Prüft ob ein Item-Name eigentlich in den jeweils anderen Tab gehört.
 * Cross-Move passiert nur wenn die eigene Detection Default returnt UND
 * die andere einen echten Match hat. Keyword-only, synchron, keine API-Calls.
 *
 * @param {string} name - Item-Name (bereits ge-trimmed, ohne Quantity)
 * @param {'grocery' | 'misc'} currentMode - aktueller Tab
 * @returns {object} - { shouldMoveTo: null | 'grocery' | 'misc', category?: string, location_tag?: string }
 */
export function crossDetect(name, currentMode) {
  if (!name) return { shouldMoveTo: null };

  if (currentMode === 'grocery') {
    const ownMatch = detectCategory(name);
    if (ownMatch !== DEFAULT_CATEGORY) return { shouldMoveTo: null };
    const otherMatch = detectLocation(name);
    if (otherMatch === DEFAULT_MISC_LOCATION) return { shouldMoveTo: null };
    return { shouldMoveTo: 'misc', location_tag: otherMatch };
  }

  if (currentMode === 'misc') {
    const ownMatch = detectLocation(name);
    if (ownMatch !== DEFAULT_MISC_LOCATION) return { shouldMoveTo: null };
    const otherMatch = detectCategory(name);
    if (otherMatch === DEFAULT_CATEGORY) return { shouldMoveTo: null };
    return { shouldMoveTo: 'grocery', category: otherMatch };
  }

  return { shouldMoveTo: null };
}
