import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('renders message', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('renders with default confirm label', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('renders with default cancel label', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders with custom confirm label', () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" />);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('renders with custom cancel label', () => {
      render(<ConfirmDialog {...defaultProps} cancelLabel="Go Back" />);
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders with primary variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-blue-600');
    });

    it('renders with danger variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('cancel button is always neutral', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('bg-gray-700');
    });
  });

  describe('Interactions', () => {
    it('calls onConfirm and onClose when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when dialog content is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(screen.getByText('Confirm Action')).toHaveAttribute('id', 'dialog-title');
    });
  });

  describe('Styling', () => {
    it('has dark background overlay', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const backdrop = container.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
    });

    it('has animation class', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const dialog = container.querySelector('.animate-fade-in');
      expect(dialog).toBeInTheDocument();
    });

    it('centers dialog on screen', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const backdrop = container.querySelector('.flex.items-center.justify-center');
      expect(backdrop).toBeInTheDocument();
    });
  });
});

describe('useConfirmDialog', () => {
  function TestComponent() {
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const handleConfirmAction = async () => {
      const result = await confirm({
        title: 'Delete Item',
        message: 'Are you sure?',
        confirmLabel: 'Delete',
        variant: 'danger',
      });

      if (result) {
        // Action confirmed
      }
    };

    return (
      <div>
        <button onClick={handleConfirmAction}>Delete</button>
        <ConfirmDialog />
      </div>
    );
  }

  describe('Hook Usage', () => {
    it('renders dialog when confirm is called', async () => {
      render(<TestComponent />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('shows custom title and message', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Delete Item')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      });
    });

    it('shows custom button labels', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      // Should have trigger button + confirm button
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('applies custom variant', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      // Get the confirm button inside the dialog (second Delete button)
      expect(deleteButtons[1]).toHaveClass('bg-red-600');
    });
  });

  describe('Promise Resolution', () => {
    it('resolves to true when confirmed', async () => {
      const onResult = vi.fn();

      function TestPromise() {
        const { confirm, ConfirmDialog } = useConfirmDialog();

        const handleClick = async () => {
          const result = await confirm({
            title: 'Confirm',
            message: 'Proceed?',
          });
          onResult(result);
        };

        return (
          <div>
            <button onClick={handleClick}>Ask</button>
            <ConfirmDialog />
          </div>
        );
      }

      render(<TestPromise />);
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(onResult).toHaveBeenCalledWith(true);
      });
    });

    it('resolves to false when cancelled', async () => {
      const onResult = vi.fn();

      function TestPromise() {
        const { confirm, ConfirmDialog } = useConfirmDialog();

        const handleClick = async () => {
          const result = await confirm({
            title: 'Confirm',
            message: 'Proceed?',
          });
          onResult(result);
        };

        return (
          <div>
            <button onClick={handleClick}>Ask</button>
            <ConfirmDialog />
          </div>
        );
      }

      render(<TestPromise />);
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(onResult).toHaveBeenCalledWith(false);
      });
    });

    it('resolves to false when backdrop is clicked', async () => {
      const onResult = vi.fn();

      function TestPromise() {
        const { confirm, ConfirmDialog } = useConfirmDialog();

        const handleClick = async () => {
          const result = await confirm({
            title: 'Confirm',
            message: 'Proceed?',
          });
          onResult(result);
        };

        return (
          <div>
            <button onClick={handleClick}>Ask</button>
            <ConfirmDialog />
          </div>
        );
      }

      const { container } = render(<TestPromise />);
      fireEvent.click(screen.getByText('Ask'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(onResult).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Dialog State', () => {
    it('closes dialog after confirmation', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      // Click the confirm button inside the dialog (second Delete button)
      fireEvent.click(deleteButtons[1]);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes dialog after cancellation', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
