import React from 'react';
import { CATEGORIES } from '../../constants/categories';

export default function CategoryPicker({ currentCategory, onSelect, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:max-w-[480px] mx-auto bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="px-4 pb-4">
          <h3
            className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-3"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Kategorie ändern
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                data-testid={`category-option-${cat.id}`}
                onClick={() => onSelect(cat.name)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl active:scale-95 transition-transform duration-100 border-2 ${
                  currentCategory === cat.name
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-transparent'
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[10px] text-center text-slate-600 dark:text-slate-400 leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 mt-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </>
  );
}
