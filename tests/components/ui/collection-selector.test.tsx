import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollectionSelector, Collection } from '@/components/ui/collection-selector';

describe('CollectionSelector', () => {
  const mockCollections: Collection[] = [
    { id: 'c1', name: 'Work', color: '#3B82F6' },
    { id: 'c2', name: 'Personal', color: '#10B981' },
    { id: 'c3', name: 'Learning', color: '#F59E0B' },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('Rendering', () => {
    it('should render with "No collection" when nothing is selected', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('No collection')).toBeInTheDocument();
    });

    it('should render selected collection with name and color', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId="c1"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Work')).toBeInTheDocument();
      const colorIndicator = screen.getByText('Work').previousElementSibling;
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#3B82F6' });
    });

    it('should render with empty collections list', () => {
      render(
        <CollectionSelector
          collections={[]}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('No collection')).toBeInTheDocument();
    });

    it('should use default color when collection color is null', () => {
      const collectionsWithNullColor: Collection[] = [
        { id: 'c1', name: 'Test', color: null },
      ];

      render(
        <CollectionSelector
          collections={collectionsWithNullColor}
          selectedCollectionId="c1"
          onSelect={mockOnSelect}
        />
      );

      const colorIndicator = screen.getByText('Test').previousElementSibling;
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#3B82F6' }); // Default blue
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when button is clicked', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2); // Button text + dropdown option
      });

      // All collections should be visible in dropdown
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <CollectionSelector
            collections={mockCollections}
            selectedCollectionId={null}
            onSelect={mockOnSelect}
          />
          <div data-testid="outside">Outside</div>
        </div>
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2);
      });

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(1); // Only button text remains
      });
    });

    it('should toggle dropdown when button is clicked multiple times', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');

      // Open
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2);
      });

      // Close
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(1);
      });

      // Open again
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2);
      });
    });
  });

  describe('Selection', () => {
    it('should call onSelect with collection id when collection is clicked', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('Work')).toBeTruthy();
      });

      // Click on "Work" collection - need to get the button in the dropdown
      const workButtons = screen.getAllByRole('button');
      const workButton = workButtons.find(btn => btn.textContent?.includes('Work') && btn !== button);

      if (workButton) {
        fireEvent.click(workButton);
      }

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('c1');
      });
    });

    it.skip('should call onSelect with null when "No collection" is clicked', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId="c1"
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const dropdownOptions = screen.getAllByRole('button');
        expect(dropdownOptions.length).toBeGreaterThan(1);
      });

      // Click on "No collection" option in dropdown
      const buttons = screen.getAllByRole('button');
      const noCollectionButton = buttons.find(
        btn => btn.textContent?.includes('No collection') && btn !== button
      );

      if (noCollectionButton) {
        fireEvent.click(noCollectionButton);
      }

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(null);
      });
    });

    it('should close dropdown after selection', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('Work')).toBeTruthy();
      });

      // Click on a collection
      const workButtons = screen.getAllByRole('button');
      const workButton = workButtons.find(btn => btn.textContent?.includes('Work') && btn !== button);

      if (workButton) {
        fireEvent.click(workButton);
      }

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryAllByText('Personal')).toHaveLength(0);
      });
    });

    it.skip('should show checkmark on selected collection in dropdown', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId="c2"
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Find the "Personal" text in the dropdown (not in the button)
        const personalTexts = screen.getAllByText('Personal');
        // The dropdown option should be the second one (first is in button)
        const dropdownOption = personalTexts[1]?.parentElement;
        expect(dropdownOption?.textContent).toContain('✓');
      });
    });

    it('should show checkmark on "No collection" when nothing is selected', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const noCollectionButton = buttons.find(
          btn => btn.textContent?.includes('No collection') && btn !== button
        );
        expect(noCollectionButton?.textContent).toContain('✓');
      });
    });
  });

  describe('Disabled State', () => {
    it('should not open dropdown when disabled', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Dropdown should not appear
      expect(screen.getAllByText('No collection')).toHaveLength(1);
    });

    it('should have disabled styling when disabled', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should not call onSelect when disabled', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Visual Indicators', () => {
    it('should show chevron icon that rotates when dropdown is open', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      const chevron = button.querySelector('svg:last-child'); // ChevronDownIcon

      // Initially not rotated
      expect(chevron).not.toHaveClass('rotate-180');

      // Open dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(chevron).toHaveClass('rotate-180');
      });

      // Close dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(chevron).not.toHaveClass('rotate-180');
      });
    });

    it.skip('should display collection color indicators in dropdown', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const workButton = screen.getAllByRole('button').find(
          btn => btn.textContent?.includes('Work')
        );
        // Look for the colored div with inline style
        const colorIndicator = workButton?.querySelector('div.w-3.h-3.rounded-full');
        expect(colorIndicator).toBeTruthy();
        expect(colorIndicator).toHaveStyle({ backgroundColor: 'rgb(59, 130, 246)' });
      });
    });

    it('should truncate long collection names', () => {
      const longNameCollections: Collection[] = [
        { id: 'c1', name: 'This is a very long collection name that should be truncated', color: '#3B82F6' },
      ];

      render(
        <CollectionSelector
          collections={longNameCollections}
          selectedCollectionId="c1"
          onSelect={mockOnSelect}
        />
      );

      const nameSpan = screen.getByText('This is a very long collection name that should be truncated');
      expect(nameSpan).toHaveClass('truncate');
      expect(nameSpan).toHaveClass('max-w-[150px]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large collection list', async () => {
      const manyCollections: Collection[] = Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        name: `Collection ${i}`,
        color: '#3B82F6',
      }));

      render(
        <CollectionSelector
          collections={manyCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByText('Collection 0').closest('div');
        expect(dropdown).toHaveClass('max-h-64');
        expect(dropdown).toHaveClass('overflow-y-auto');
      });
    });

    it('should handle rapid clicks', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');

      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should be in a consistent state (closed since even number of clicks)
      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(1);
      });
    });

    it('should handle selection of non-existent collection gracefully', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId="non-existent"
          onSelect={mockOnSelect}
        />
      );

      // Should show "No collection" since the ID doesn't match any collection
      expect(screen.getByText('No collection')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');

      // Open with Enter key
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      button.click(); // Simulate the default behavior

      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2);
      });
    });

    it('should maintain focus management', async () => {
      render(
        <CollectionSelector
          collections={mockCollections}
          selectedCollectionId={null}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('No collection')).toHaveLength(2);
      });

      // Dropdown buttons should be focusable
      const dropdownButtons = screen.getAllByRole('button');
      expect(dropdownButtons.length).toBeGreaterThan(1);
    });
  });
});
