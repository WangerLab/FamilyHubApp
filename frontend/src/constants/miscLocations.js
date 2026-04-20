// Predefined location tags for the "Sonstiges" (misc) shopping list.
// Custom tags are supported by just saving an arbitrary string in location_tag.

export const MISC_LOCATIONS = [
  { id: 'apotheke',    name: 'Apotheke',    emoji: '💊', color: '#ef4444' },
  { id: 'baumarkt',    name: 'Baumarkt',    emoji: '🔨', color: '#f97316' },
  { id: 'drogerie',    name: 'Drogerie',    emoji: '🧴', color: '#a855f7' },
  { id: 'zoohandlung', name: 'Zoohandlung', emoji: '🐾', color: '#22c55e' },
  { id: 'kleidung',    name: 'Kleidung',    emoji: '👕', color: '#0ea5e9' },
  { id: 'sonstiges',   name: 'Sonstiges',   emoji: '📦', color: '#64748b' },
];

export const DEFAULT_MISC_LOCATION = 'Sonstiges';

export function getLocationMeta(tagName) {
  return (
    MISC_LOCATIONS.find((l) => l.name === tagName) ||
    // Custom tag fallback — uses neutral style
    { id: `custom-${tagName}`, name: tagName, emoji: '🏷️', color: '#64748b' }
  );
}
