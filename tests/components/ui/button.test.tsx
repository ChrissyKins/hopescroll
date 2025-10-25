import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders children text', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('renders with default variant (primary)', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('renders with default size (md)', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('Variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('renders success variant', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-600');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('renders neutral variant', () => {
      render(<Button variant="neutral">Neutral</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-700');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('renders medium size', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Disabled State', () => {
    it('renders disabled button', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed', 'opacity-60');
    });

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<Button disabled onClick={onClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('renders loading spinner when loading is true', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      const spinner = button.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed', 'opacity-60');
    });

    it('does not call onClick when loading', () => {
      const onClick = vi.fn();
      render(<Button loading onClick={onClick}>Loading</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('renders children text alongside spinner when loading', () => {
      render(<Button loading>Loading...</Button>);
      expect(screen.getByRole('button', { name: /Loading/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover styles on hover (via className)', () => {
      render(<Button variant="primary">Hover Me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-blue-700');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('passes through aria-label attribute', () => {
      render(<Button aria-label="Custom label">Icon Button</Button>);
      const button = screen.getByRole('button', { name: 'Custom label' });
      expect(button).toBeInTheDocument();
    });

    it('passes through data attributes', () => {
      render(<Button data-testid="custom-button">Test</Button>);
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });
  });

  describe('Base Styles', () => {
    it('always includes base styles', () => {
      render(<Button>Base Styles</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-lg', 'font-medium', 'transition-all');
    });

    it('includes flex layout styles', () => {
      render(<Button>Flex Layout</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center', 'gap-2');
    });
  });
});
