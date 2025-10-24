import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from '@/components/navigation';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/watch');
  });

  it('renders the app title', () => {
    render(<Navigation />);
    expect(screen.getByText('Forest Cabin')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Navigation />);
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByText('Scroll')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<Navigation />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    render(<Navigation />);

    const watchLink = screen.getByText('Watch').closest('a');
    expect(watchLink).toHaveClass('border-blue-500');
  });

  it('does not highlight inactive navigation items', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    render(<Navigation />);

    const sourcesLink = screen.getByText('Sources').closest('a');
    expect(sourcesLink).toHaveClass('border-transparent');
  });

  it('updates active state when pathname changes', () => {
    const { rerender } = render(<Navigation />);

    // Initially on /watch
    vi.mocked(usePathname).mockReturnValue('/watch');
    rerender(<Navigation />);
    expect(screen.getByText('Watch').closest('a')).toHaveClass('border-blue-500');

    // Navigate to /sources
    vi.mocked(usePathname).mockReturnValue('/sources');
    rerender(<Navigation />);
    expect(screen.getByText('Sources').closest('a')).toHaveClass('border-blue-500');
    expect(screen.getByText('Watch').closest('a')).toHaveClass('border-transparent');
  });

  it('calls signOut with correct callback when sign out button is clicked', async () => {
    render(<Navigation />);

    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('has correct href for each navigation link', () => {
    render(<Navigation />);

    expect(screen.getByText('Watch').closest('a')).toHaveAttribute('href', '/watch');
    expect(screen.getByText('Scroll').closest('a')).toHaveAttribute('href', '/scroll');
    expect(screen.getByText('Sources').closest('a')).toHaveAttribute('href', '/sources');
    expect(screen.getByText('Filters').closest('a')).toHaveAttribute('href', '/filters');
    expect(screen.getByText('Saved').closest('a')).toHaveAttribute('href', '/saved');
    expect(screen.getByText('History').closest('a')).toHaveAttribute('href', '/history');
  });

  it('applies dark mode classes when not on watch page', () => {
    vi.mocked(usePathname).mockReturnValue('/sources');
    const { container } = render(<Navigation />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('dark:bg-gray-800', 'dark:border-gray-700');
  });

  it('applies dark mode styles when on watch page', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    const { container } = render(<Navigation />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('bg-gray-900', 'border-gray-800');
  });

  it('applies hover styles to inactive links', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    render(<Navigation />);

    const sourcesLink = screen.getByText('Sources').closest('a');
    // When on /watch page, links use dark mode styles
    expect(sourcesLink).toHaveClass('hover:text-gray-300');
  });

  it('applies hover styles to sign out button', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    render(<Navigation />);

    const signOutButton = screen.getByText('Sign out');
    // When on /watch page, uses dark mode styles
    expect(signOutButton).toHaveClass('hover:text-white');
  });

  it('renders with correct responsive container', () => {
    const { container } = render(<Navigation />);
    const innerContainer = container.querySelector('.max-w-7xl');
    expect(innerContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
  });

  it('hides navigation items on small screens', () => {
    const { container } = render(<Navigation />);
    const navItems = container.querySelector('.sm\\:flex');
    expect(navItems).toHaveClass('hidden', 'sm:ml-6', 'sm:flex');
  });

  it('positions sign out button correctly', () => {
    const { container } = render(<Navigation />);
    const signOutContainer = screen.getByText('Sign out').parentElement;
    expect(signOutContainer).toHaveClass('flex', 'items-center');
  });

  it('highlights different navigation items correctly', () => {
    const navItems = [
      { path: '/watch', label: 'Watch' },
      { path: '/scroll', label: 'Scroll' },
      { path: '/sources', label: 'Sources' },
      { path: '/filters', label: 'Filters' },
      { path: '/saved', label: 'Saved' },
      { path: '/history', label: 'History' },
    ];

    navItems.forEach(({ path, label }) => {
      vi.mocked(usePathname).mockReturnValue(path);
      const { unmount } = render(<Navigation />);

      const activeLink = screen.getByRole('link', { name: label });
      expect(activeLink).toHaveClass('border-blue-500');

      unmount();
    });
  });

  it('maintains border bottom style for active item', () => {
    vi.mocked(usePathname).mockReturnValue('/watch');
    render(<Navigation />);

    const watchLink = screen.getByText('Watch').closest('a');
    expect(watchLink).toHaveClass('border-b-2');
  });

  it('renders title with correct styling', () => {
    render(<Navigation />);

    const title = screen.getByText('Forest Cabin');
    expect(title).toHaveClass('text-lg', 'font-bold');
  });
});
