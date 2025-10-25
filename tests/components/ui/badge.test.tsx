import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders children text', () => {
      render(<Badge variant="neutral">Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('renders with default size (md)', () => {
      render(<Badge variant="neutral">Default Size</Badge>);
      const badge = screen.getByText('Default Size');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });
  });

  describe('Variants', () => {
    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-900', 'text-green-300');
    });

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-red-900', 'text-red-300');
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-yellow-900', 'text-yellow-300');
    });

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-blue-900', 'text-blue-300');
    });

    it('renders neutral variant', () => {
      render(<Badge variant="neutral">Neutral</Badge>);
      const badge = screen.getByText('Neutral');
      expect(badge).toHaveClass('bg-gray-800', 'text-gray-300');
    });

    it('renders muted variant', () => {
      render(<Badge variant="muted">Muted</Badge>);
      const badge = screen.getByText('Muted');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-400');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Badge variant="neutral" size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('renders medium size', () => {
      render(<Badge variant="neutral" size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });
  });

  describe('Base Styles', () => {
    it('always includes base styles', () => {
      render(<Badge variant="neutral">Base Styles</Badge>);
      const badge = screen.getByText('Base Styles');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'font-medium', 'rounded-full');
    });
  });

  describe('Content Rendering', () => {
    it('renders text content', () => {
      render(<Badge variant="neutral">Text Content</Badge>);
      expect(screen.getByText('Text Content')).toBeInTheDocument();
    });

    it('renders with numbers', () => {
      render(<Badge variant="info">{42}</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders long text without breaking layout', () => {
      const longText = 'This is a very long badge text that should not break the layout';
      render(<Badge variant="neutral">{longText}</Badge>);
      const badge = screen.getByText(longText);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('inline-flex');
    });
  });

  describe('Semantic Rendering', () => {
    it('renders as a span element', () => {
      const { container } = render(<Badge variant="neutral">Span Element</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('Span Element');
    });

    it('does not have interactive elements by default', () => {
      const { container } = render(<Badge variant="neutral">Non-interactive</Badge>);
      const badge = container.querySelector('span');
      expect(badge?.tagName).toBe('SPAN');
      expect(badge).not.toHaveAttribute('role', 'button');
    });
  });

  describe('Color Contrast', () => {
    it('uses dark background with light text for success', () => {
      render(<Badge variant="success">Contrast Check</Badge>);
      const badge = screen.getByText('Contrast Check');
      expect(badge).toHaveClass('bg-green-900', 'text-green-300');
    });

    it('uses dark background with light text for error', () => {
      render(<Badge variant="error">Contrast Check</Badge>);
      const badge = screen.getByText('Contrast Check');
      expect(badge).toHaveClass('bg-red-900', 'text-red-300');
    });

    it('uses dark background with light text for warning', () => {
      render(<Badge variant="warning">Contrast Check</Badge>);
      const badge = screen.getByText('Contrast Check');
      expect(badge).toHaveClass('bg-yellow-900', 'text-yellow-300');
    });
  });
});
