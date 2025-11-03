'use client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function ToggleSwitch({ checked, onChange, label, disabled = false, size = 'md' }: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      container: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      container: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  };

  const classes = sizeClasses[size];

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center ${classes.container} rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          }
        `}
      >
        <span
          className={`
            ${classes.thumb} inline-block rounded-full bg-white
            transform transition-transform duration-200 ease-in-out
            ${checked ? classes.translate : 'translate-x-0.5'}
          `}
        />
      </button>
    </label>
  );
}
