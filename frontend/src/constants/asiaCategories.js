// Fixed categories for the Asia shopping list.
// Asia is rarely shopped (~1x per month), users assign categories manually
// or via Brain Dump (planned F-4). Hence no keyword arrays and no
// detectCategory helper — unlike grocery categories.

export const ASIA_CATEGORIES = [
  { id: 'sauces',      name: 'Saucen & Pasten',       emoji: '🍶' },
  { id: 'spices',      name: 'Gewürze',               emoji: '🌶️' },
  { id: 'rice_flours', name: 'Reis & Mehle',          emoji: '🍚' },
  { id: 'noodles',     name: 'Nudeln & Teigwaren',    emoji: '🍜' },
  { id: 'canned_dry',  name: 'Konserven & Trocken',   emoji: '🥫' },
  { id: 'fresh_frozen',name: 'Frisch & TK',           emoji: '🧊' },
  { id: 'snacks',      name: 'Snacks & Süß',          emoji: '🍡' },
  { id: 'other',       name: 'Sonstiges Asia',        emoji: '🥢' },
];
