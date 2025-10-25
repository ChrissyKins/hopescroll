import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/toast';

// Test component that uses the toast context
function TestComponent() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.addToast({ type: 'success', message: 'Custom', duration: 0 })}>
        Show Persistent
      </button>
      <button
        onClick={() =>
          toast.addToast({
            type: 'info',
            message: 'With action',
            action: { label: 'Undo', onClick: () => {} },
          })
        }
      >
        Show With Action
      </button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('throws error when useToast is used outside provider', () => {
      const ErrorComponent = () => {
        useToast();
        return null;
      };

      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<ErrorComponent />)).toThrow('useToast must be used within a ToastProvider');
      spy.mockRestore();
    });
  });

  describe('Toast Types', () => {
    it('shows success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-600');
    });

    it('shows error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-600');
    });

    it('shows warning toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-600');
    });

    it('shows info toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-600');
    });
  });

  describe('Toast Display', () => {
    it('displays toast message', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('displays toast with icon', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      const toast = screen.getByRole('alert');
      const icon = toast.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays close button', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });
  });

  describe('Toast Actions', () => {
    it('displays action button when provided', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show With Action'));
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('calls action onClick when action button is clicked', () => {
      const onAction = vi.fn();

      const ActionComponent = () => {
        const toast = useToast();
        return (
          <button
            onClick={() =>
              toast.addToast({
                type: 'success',
                message: 'With action',
                action: { label: 'Action', onClick: onAction },
              })
            }
          >
            Show Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <ActionComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      fireEvent.click(screen.getByText('Action'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast Dismissal', () => {
    it('removes toast when close button is clicked', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Close notification'));
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('auto-dismisses toast after default duration (4000ms)', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('auto-dismisses toast after custom duration', () => {
      const CustomDurationComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.success('Custom duration', 2000)}>Show Toast</button>
        );
      };

      render(
        <ToastProvider>
          <CustomDurationComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
    });

    it('does not auto-dismiss when duration is 0', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Persistent'));
      expect(screen.getByText('Custom')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Multiple Toasts', () => {
    it('displays multiple toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('limits toasts to maximum of 3', () => {
      const MultiToastComponent = () => {
        const toast = useToast();
        return (
          <button
            onClick={() => {
              toast.success('Toast 1');
              toast.success('Toast 2');
              toast.success('Toast 3');
              toast.success('Toast 4');
            }}
          >
            Show Many
          </button>
        );
      };

      render(
        <ToastProvider>
          <MultiToastComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Many'));

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);

      // Should keep the last 3 (Toast 2, 3, 4)
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="alert" on toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="polite" on container', () => {
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const toastContainer = container.querySelector('[aria-live="polite"]');
      expect(toastContainer).toBeInTheDocument();
    });

    it('has aria-atomic="true" on container', () => {
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const toastContainer = container.querySelector('[aria-atomic="true"]');
      expect(toastContainer).toBeInTheDocument();
    });

    it('has accessible close button', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });
  });

  describe('Toast Container', () => {
    it('positions toasts at bottom-right', () => {
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));

      const toastContainer = container.querySelector('.fixed.bottom-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });

    it('has high z-index', () => {
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const toastContainer = container.querySelector('.z-50');
      expect(toastContainer).toBeInTheDocument();
    });
  });
});
