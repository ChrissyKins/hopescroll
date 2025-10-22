import { ReactNode } from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: {
    label: string;
    onClick: () => void;
  }[];
}

export function EmptyState({
  icon,
  heading,
  description,
  primaryAction,
  secondaryActions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-6 opacity-50">{icon}</div>

      <h2 className="text-2xl font-semibold text-gray-200 mb-3">{heading}</h2>

      <p className="text-gray-400 max-w-md mb-8 leading-relaxed">{description}</p>

      {primaryAction && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button variant="primary" size="md" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>

          {secondaryActions &&
            secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="md"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
