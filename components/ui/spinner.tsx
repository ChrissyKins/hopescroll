export type SpinnerVariant = 'default' | 'primary' | 'success' | 'danger';
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function Spinner({ size = 'md', variant = 'default' }: SpinnerProps) {
  const sizeStyles: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const variantStyles: Record<SpinnerVariant, string> = {
    default: 'text-white',
    primary: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
  };

  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${variantStyles[variant]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
      role="status"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Centered spinner with optional message for full-page loading states
 */
export interface CenteredSpinnerProps {
  message?: string;
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function CenteredSpinner({ message, size = 'lg', variant = 'default' }: CenteredSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Spinner size={size} variant={variant} />
      {message && <p className="text-gray-400 text-sm">{message}</p>}
    </div>
  );
}
