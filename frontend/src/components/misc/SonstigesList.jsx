import React, { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { MISC_LOCATIONS, getLocationMeta } from '../../constants/miscLocations';
import { useMisc } from '../../contexts/MiscContext';
import { useAuth } from '../../contexts/AuthContext';
import AddMiscItemInput from './AddMiscItemInput';
import MiscItemRow from './MiscItemRow';

function EmptyState({ color }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <ShoppingBag className="w-10 h-10" style={{ color: `${color}80` }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Noch nichts gesammelt
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[260px]">
        Medikamente, Werkzeug, Drogerie… tippe oben ein was du brauchst.
      </p>
    </div>
  );
}

/**
 * SonstigesList — list view for misc_items, rendered inside ShoppingTab.
 * The AddInput + BrainDump live in ShoppingTab's sticky header; this component
 * renders only the grouped list + empty state.
 */
export default function SonstigesList({ stickyTop, shoppingMode }) {
  const { member } = useAuth();
  const { items, loading } = useMisc();
  const userColor = member?.color || '#3B82F6';

  // Group items by location_tag. Predefined order first, custom tags A→Z afterwards.
  const { groups, orderedTags } = useMemo(() => {
    const groupMap = {};
    for (const it of items) {
      const tag = it.location_tag || 'Sonstiges';
      (groupMap[tag] ||= []).push(it);
    }
    Object.values(groupMap).forEach((arr) => {
      // Unchecked first, then checked (within a tag group)
      arr.sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    });
    const predefined = MISC_LOCATIONS.map((l) => l.name).filter((n) => groupMap[n]);
    const customTags = Object.keys(groupMap)
      .filter((t) => !MISC_LOCATIONS.some((l) => l.name === t))
      .sort((a, b) => a.localeCompare(b, 'de'));
    return { groups: groupMap, orderedTags: [...predefined, ...customTags] };
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState color={userColor} />;
  }

  return (
    <div data-testid="misc-list">
      {orderedTags.map((tag) => {
        const meta = getLocationMeta(tag);
        const tagItems = groups[tag];
        const uncheckedInTag = tagItems.filter((i) => !i.checked).length;
        return (
          <div key={tag} data-tag={tag} style={{ scrollMarginTop: stickyTop }}>
            <div
              className="sticky z-30 flex items-center gap-2 px-4 py-1.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800"
              style={{ top: stickyTop }}
            >
              <span className="text-base">{meta.emoji}</span>
              <span
                className="text-sm font-semibold text-slate-900 dark:text-slate-50"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {meta.name}
              </span>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {uncheckedInTag}/{tagItems.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {tagItems.map((item) => (
                <MiscItemRow key={item.id} item={item} shoppingMode={shoppingMode} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Expose the AddInput so ShoppingTab can render it inside the sticky header
SonstigesList.AddInput = function MiscAddInputConnected({ onAdd }) {
  const { addItem } = useMisc();
  return <AddMiscItemInput onAdd={onAdd || ((data) => addItem(data))} />;
};
