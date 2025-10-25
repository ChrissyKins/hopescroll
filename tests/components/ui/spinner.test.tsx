import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, CenteredSpinner } from '@/components/ui/spinner';

describe('Spinner', () => {
  describe('Rendering', () => {
    it('renders as an SVG element', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders with default size (md)', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });

    it('renders with default variant (default)', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Spinner size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('renders medium size', () => {
      const { container } = render(<Spinner size="md" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });

    it('renders large size', () => {
      const { container } = render(<Spinner size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('renders extra large size', () => {
      const { container } = render(<Spinner size="xl" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Variants', () => {
    it('renders default variant (white)', () => {
      const { container } = render(<Spinner variant="default" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
    });

    it('renders primary variant (blue)', () => {
      const { container } = render(<Spinner variant="primary" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });

    it('renders success variant (green)', () => {
      const { container } = render(<Spinner variant="success" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-green-600');
    });

    it('renders danger variant (red)', () => {
      const { container } = render(<Spinner variant="danger" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-red-600');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for screen readers', () => {
      render(<Spinner />);
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('has role="status" for screen readers', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg[role="status"]');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('has spin animation class', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('SVG Structure', () => {
    it('contains a circle element', () => {
      const { container } = render(<Spinner />);
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });

    it('contains a path element', () => {
      const { container } = render(<Spinner />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('has correct viewBox', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });
});

describe('CenteredSpinner', () => {
  describe('Rendering', () => {
    it('renders the Spinner component', () => {
      const { container } = render(<CenteredSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders with default size (lg)', () => {
      const { container } = render(<CenteredSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('renders with default variant (default)', () => {
      const { container } = render(<CenteredSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
    });
  });

  describe('Layout', () => {
    it('centers content with flexbox', () => {
      const { container } = render(<CenteredSpinner />);
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('flex-col', 'items-center', 'justify-center');
    });

    it('has vertical padding', () => {
      const { container } = render(<CenteredSpinner />);
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('py-12');
    });

    it('has gap between spinner and message', () => {
      const { container } = render(<CenteredSpinner />);
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('gap-4');
    });
  });

  describe('Message', () => {
    it('renders message when provided', () => {
      render(<CenteredSpinner message="Loading content..." />);
      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });

    it('does not render message when not provided', () => {
      const { container } = render(<CenteredSpinner />);
      const message = container.querySelector('p');
      expect(message).not.toBeInTheDocument();
    });

    it('applies correct text styling to message', () => {
      render(<CenteredSpinner message="Loading..." />);
      const message = screen.getByText('Loading...');
      expect(message).toHaveClass('text-gray-400', 'text-sm');
    });
  });

  describe('Props', () => {
    it('accepts custom size', () => {
      const { container } = render(<CenteredSpinner size="xl" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });

    it('accepts custom variant', () => {
      const { container } = render(<CenteredSpinner variant="primary" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });

    it('accepts both size and variant', () => {
      const { container } = render(<CenteredSpinner size="sm" variant="success" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4', 'text-green-600');
    });

    it('accepts all props together', () => {
      const { container } = render(
        <CenteredSpinner size="md" variant="danger" message="Error loading..." />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6', 'text-red-600');
      expect(screen.getByText('Error loading...')).toBeInTheDocument();
    });
  });
});
