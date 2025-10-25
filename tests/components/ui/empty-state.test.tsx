import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  const defaultProps = {
    icon: '📭',
    heading: 'No items found',
    description: 'Try adding some items to get started.',
  };

  describe('Rendering', () => {
    it('renders icon', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('📭')).toBeInTheDocument();
    });

    it('renders heading', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('Try adding some items to get started.')).toBeInTheDocument();
    });

    it('renders with custom icon element', () => {
      const customIcon = <div data-testid="custom-icon">Icon</div>;
      render(<EmptyState {...defaultProps} icon={customIcon} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Primary Action', () => {
    it('does not render primary action button when not provided', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders primary action button when provided', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };

      render(<EmptyState {...defaultProps} primaryAction={primaryAction} />);
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('calls onClick when primary action button is clicked', () => {
      const onClick = vi.fn();
      const primaryAction = {
        label: 'Add Item',
        onClick,
      };

      render(<EmptyState {...defaultProps} primaryAction={primaryAction} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders primary action with primary variant', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };

      render(<EmptyState {...defaultProps} primaryAction={primaryAction} />);
      const button = screen.getByRole('button', { name: 'Add Item' });
      expect(button).toHaveClass('bg-blue-600');
    });
  });

  describe('Secondary Actions', () => {
    it('does not render secondary actions when not provided', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };

      render(<EmptyState {...defaultProps} primaryAction={primaryAction} />);
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('renders single secondary action', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        {
          label: 'Learn More',
          onClick: vi.fn(),
        },
      ];

      render(
        <EmptyState
          {...defaultProps}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
    });

    it('renders multiple secondary actions', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        {
          label: 'Learn More',
          onClick: vi.fn(),
        },
        {
          label: 'View Examples',
          onClick: vi.fn(),
        },
      ];

      render(
        <EmptyState
          {...defaultProps}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Examples' })).toBeInTheDocument();
    });

    it('calls onClick when secondary action is clicked', () => {
      const onClick = vi.fn();
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        {
          label: 'Learn More',
          onClick,
        },
      ];

      render(
        <EmptyState
          {...defaultProps}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Learn More' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders secondary actions with ghost variant', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        {
          label: 'Learn More',
          onClick: vi.fn(),
        },
      ];

      render(
        <EmptyState
          {...defaultProps}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: 'Learn More' });
      expect(secondaryButton).toHaveClass('bg-transparent');
    });
  });

  describe('Layout', () => {
    it('has centered layout', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('has vertical padding', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.querySelector('.py-16');
      expect(wrapper).toBeInTheDocument();
    });

    it('has text-center class', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.querySelector('.text-center');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('renders heading with correct styles', () => {
      render(<EmptyState {...defaultProps} />);
      const heading = screen.getByText('No items found');
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-2xl', 'font-semibold', 'text-gray-200');
    });

    it('renders description with correct styles', () => {
      render(<EmptyState {...defaultProps} />);
      const description = screen.getByText('Try adding some items to get started.');
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-gray-400');
    });

    it('limits description width', () => {
      render(<EmptyState {...defaultProps} />);
      const description = screen.getByText('Try adding some items to get started.');
      expect(description).toHaveClass('max-w-md');
    });
  });

  describe('Icon Styling', () => {
    it('renders icon with large size', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const iconWrapper = container.querySelector('.text-6xl');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('renders icon with reduced opacity', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const iconWrapper = container.querySelector('.opacity-50');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('has spacing below icon', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const iconWrapper = container.querySelector('.mb-6');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('Action Button Layout', () => {
    it('uses flexbox layout for action buttons', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        {
          label: 'Learn More',
          onClick: vi.fn(),
        },
      ];

      const { container } = render(
        <EmptyState
          {...defaultProps}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      const buttonWrapper = container.querySelector('.flex.flex-col.sm\\:flex-row.gap-3');
      expect(buttonWrapper).toBeInTheDocument();
    });

    it('centers action buttons', () => {
      const primaryAction = {
        label: 'Add Item',
        onClick: vi.fn(),
      };

      const { container } = render(
        <EmptyState {...defaultProps} primaryAction={primaryAction} />
      );

      const buttonWrapper = container.querySelector('.items-center');
      expect(buttonWrapper).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('renders complete empty state with all options', () => {
      const primaryAction = {
        label: 'Get Started',
        onClick: vi.fn(),
      };
      const secondaryActions = [
        { label: 'Learn More', onClick: vi.fn() },
        { label: 'View Docs', onClick: vi.fn() },
      ];

      render(
        <EmptyState
          icon="🚀"
          heading="Welcome to HopeScroll"
          description="Start by adding your first content source."
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        />
      );

      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Welcome to HopeScroll')).toBeInTheDocument();
      expect(screen.getByText('Start by adding your first content source.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Docs' })).toBeInTheDocument();
    });

    it('renders minimal empty state', () => {
      render(<EmptyState icon="📭" heading="Empty" description="Nothing here yet." />);

      expect(screen.getByText('📭')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
