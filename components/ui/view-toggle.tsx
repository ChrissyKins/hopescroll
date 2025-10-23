'use client';

import { GridIcon, ListIcon, CompactIcon } from './icons';

export type ViewMode = 'grid' | 'list' | 'compact';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const views: Array<{ value: ViewMode; icon: typeof GridIcon; label: string }> = [
    { value: 'grid', icon: GridIcon, label: 'Grid View' },
    { value: 'list', icon: ListIcon, label: 'List View' },
    { value: 'compact', icon: CompactIcon, label: 'Compact View' },
  ];

  return (
    <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1">
      {views.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          title={label}
          className={`p-2 rounded transition-colors ${
            view === value
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}
