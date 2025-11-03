import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Search } from '@/components/ui/search';

describe('Search', () => {
  describe('Rendering', () => {
    it('renders search input', () => {
      render(<Search value="" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<Search value="" onChange={() => {}} />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<Search value="" onChange={() => {}} placeholder="Search sources..." />);
      expect(screen.getByPlaceholderText('Search sources...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<Search value="" onChange={() => {}} />);
      const searchIcon = container.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe('Value Management', () => {
    it('displays current value', () => {
      render(<Search value="test query" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test query');
    });

    it('calls onChange when input changes', () => {
      const onChange = vi.fn();
      render(<Search value="" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(onChange).toHaveBeenCalled();
    });

    it('renders as empty when value is empty string', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Clear Button', () => {
    it('does not show clear button when value is empty', () => {
      render(<Search value="" onChange={() => {}} onClear={() => {}} />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('shows clear button when value is not empty', () => {
      render(<Search value="search term" onChange={() => {}} onClear={() => {}} />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('calls onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      render(<Search value="search term" onChange={() => {}} onClear={onClear} />);

      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('renders clear button even when onClear is not provided', () => {
      // The component always renders the clear button when there's a value
      // It's up to the parent component to provide onClear functionality
      render(<Search value="search term" onChange={() => {}} />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });
  });

  describe('Result Count Display', () => {
    it('does not show result count when not provided', () => {
      render(<Search value="" onChange={() => {}} />);
      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it('shows "Showing all X items" when resultCount equals totalCount', () => {
      render(
        <Search value="" onChange={() => {}} resultCount={10} totalCount={10} />
      );
      expect(screen.getByText('Showing all 10 items')).toBeInTheDocument();
    });

    it('shows "Showing X of Y items" when filtered', () => {
      render(
        <Search value="test" onChange={() => {}} resultCount={5} totalCount={20} />
      );
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/of 20 items/)).toBeInTheDocument();
    });

    it('highlights result count in filtered view', () => {
      render(
        <Search value="test" onChange={() => {}} resultCount={5} totalCount={20} />
      );
      const highlightedCount = screen.getByText('5');
      expect(highlightedCount).toHaveClass('text-gray-900', 'dark:text-white', 'font-medium');
    });

    it('shows result count with 0 results', () => {
      render(
        <Search value="no match" onChange={() => {}} resultCount={0} totalCount={20} />
      );
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText(/of 20 items/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Mock focus
      HTMLElement.prototype.focus = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('focuses input on Cmd+F', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');

      fireEvent.keyDown(window, { key: 'f', metaKey: true });

      expect(input.focus).toHaveBeenCalled();
    });

    it('focuses input on Ctrl+F', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');

      fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

      expect(input.focus).toHaveBeenCalled();
    });

    it('prevents default browser find behavior on Cmd/Ctrl+F', () => {
      render(<Search value="" onChange={() => {}} />);

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Input Props', () => {
    it('accepts and applies custom className via input props', () => {
      render(<Search value="" onChange={() => {}} data-testid="search-input" />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('accepts disabled prop', () => {
      render(<Search value="" onChange={() => {}} disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('accepts name prop', () => {
      render(<Search value="" onChange={() => {}} name="search-field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'search-field');
    });

    it('accepts autoComplete prop', () => {
      render(<Search value="" onChange={() => {}} autoComplete="off" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('Styling', () => {
    it('has light and dark theme styling', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-white', 'dark:bg-gray-800', 'border-gray-300', 'dark:border-gray-700', 'text-gray-900', 'dark:text-white');
    });

    it('has focus ring styling', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-600');
    });

    it('has proper padding for icons', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10'); // Left padding for search icon
    });

    it('has proper padding for clear button when present', () => {
      render(<Search value="test" onChange={() => {}} onClear={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10'); // Right padding for clear button
    });
  });

  describe('Accessibility', () => {
    it('has type="text"', () => {
      render(<Search value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('clear button has accessible label', () => {
      render(<Search value="test" onChange={() => {}} onClear={() => {}} />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('result count has readable text format', () => {
      render(
        <Search value="" onChange={() => {}} resultCount={5} totalCount={10} />
      );
      const resultText = screen.getByText(/Showing/);
      expect(resultText.tagName).toBe('P');
      expect(resultText).toHaveClass('text-sm', 'text-gray-600', 'dark:text-gray-400');
    });
  });

  describe('Icon Display', () => {
    it('search icon is always visible', () => {
      const { container } = render(<Search value="" onChange={() => {}} />);
      const searchIcon = container.querySelector('.absolute.left-0 svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it('search icon is not interactive', () => {
      const { container } = render(<Search value="" onChange={() => {}} />);
      const iconWrapper = container.querySelector('.pointer-events-none');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('clear icon becomes visible when value exists', () => {
      render(<Search value="test" onChange={() => {}} onClear={() => {}} />);
      const clearButton = screen.getByLabelText('Clear search');
      const clearIcon = clearButton.querySelector('svg');
      expect(clearIcon).toBeInTheDocument();
    });

    it('clear button has hover effect', () => {
      render(<Search value="test" onChange={() => {}} onClear={() => {}} />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toHaveClass('hover:text-gray-600', 'dark:hover:text-gray-200', 'transition-colors');
    });
  });

  describe('Layout', () => {
    it('has relative positioning for icon placement', () => {
      const { container } = render(<Search value="" onChange={() => {}} />);
      const inputWrapper = container.querySelector('.relative');
      expect(inputWrapper).toBeInTheDocument();
    });

    it('has vertical spacing for result count', () => {
      const { container } = render(
        <Search value="" onChange={() => {}} resultCount={5} totalCount={10} />
      );
      const wrapper = container.querySelector('.space-y-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('result count is below input', () => {
      const { container } = render(
        <Search value="" onChange={() => {}} resultCount={5} totalCount={10} />
      );

      const spaceWrapper = container.querySelector('.space-y-2');
      const input = spaceWrapper?.querySelector('input');
      const resultCount = spaceWrapper?.querySelector('p');

      expect(input).toBeInTheDocument();
      expect(resultCount).toBeInTheDocument();
    });
  });
});
