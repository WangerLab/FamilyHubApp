// Generic keyword-based category detector.
// Used by categories.js (grocery), asiaCategories.js, and miscLocations.js
// to auto-categorize free-text item names.
//
// Returns BOTH the matched category name AND a confidence level so callers
// can decide whether to trust the match (exact) or fall back to AI (partial/none).
//
// Match-Variante: β — Wort-Boundary an Whitespace ODER Bindestrich.
//   "Bio-Apfel" → tokens ["bio","apfel"] → "apfel" matcht EXACT
//   "Erdbeermarmelade" → tokens ["erdbeermarmelade"] → "erdbeer" matcht PARTIAL

export const MATCH_NONE = 'none';
export const MATCH_PARTIAL = 'partial';
export const MATCH_EXACT = 'exact';

/**
 * @param {string} name - Free-text item name (e.g. "Bio-Apfel", "Erdbeermarmelade")
 * @param {Array<{name: string, keywords: string[]}>} categories - Category list
 * @param {string} defaultName - Fallback category name if nothing matches
 * @returns {{category: string, confidence: 'none'|'partial'|'exact'}}
 */
export function detectByKeywords(name, categories, defaultName) {
  if (!name || typeof name !== 'string') {
    return { category: defaultName, confidence: MATCH_NONE };
  }
  const lower = name.toLowerCase().trim();
  if (!lower) {
    return { category: defaultName, confidence: MATCH_NONE };
  }
  const tokens = lower.split(/[\s\-]+/).filter(Boolean);

  let bestExact = null;   // { category, score }
  let bestPartial = null; // { category, score }

  for (const cat of categories) {
    if (!cat?.keywords) continue;
    for (const kw of cat.keywords) {
      if (!kw) continue;
      const kwLower = kw.toLowerCase();

      // Exact match: keyword equals one of the tokens
      if (tokens.includes(kwLower)) {
        const score = kwLower.length;
        if (!bestExact || score > bestExact.score) {
          bestExact = { category: cat.name, score };
        }
        continue; // exact beats partial for this keyword, no need to check substring
      }

      // Partial match: keyword is substring of full lower-cased name
      if (lower.includes(kwLower)) {
        const score = kwLower.length;
        if (!bestPartial || score > bestPartial.score) {
          bestPartial = { category: cat.name, score };
        }
      }
    }
  }

  if (bestExact) return { category: bestExact.category, confidence: MATCH_EXACT };
  if (bestPartial) return { category: bestPartial.category, confidence: MATCH_PARTIAL };
  return { category: defaultName, confidence: MATCH_NONE };
}
