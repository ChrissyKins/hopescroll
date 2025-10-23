# HopeScroll Design System

**Version:** 1.0
**Last Updated:** 2025-10-23

## Overview

This document defines the standardized design system for HopeScroll, ensuring consistent visual design and user experience across all pages and components.

---

## Color Tokens

### Semantic Colors

```typescript
const colors = {
  primary: 'blue-600',      // Main actions, links, focus states
  success: 'green-600',     // Success states, confirmations, positive actions
  warning: 'yellow-600',    // Warnings, "not now" actions, caution states
  danger: 'red-600',        // Destructive actions, errors, delete operations
  neutral: 'gray-600',      // Secondary actions, disabled states
  info: 'blue-500',         // Informational badges, help text
};
```

### Usage Guidelines

- **Primary (blue-600):** Use for primary CTAs, active navigation items, and important actions
- **Success (green-600):** Use for confirmation buttons, success messages, and positive feedback
- **Warning (yellow-600):** Use for caution states, temporary dismissals, and warning messages
- **Danger (red-600):** Use for delete/remove actions, error states, and destructive operations
- **Neutral (gray-600/700):** Use for secondary actions, cancel buttons, and less prominent elements
- **Info (blue-500):** Use for informational badges, tips, and non-critical information

---

## Components

### Button Component

**Location:** `/components/ui/button.tsx`

#### Variants

- `primary` - Blue background, for main actions
- `success` - Green background, for confirmations
- `danger` - Red background, for destructive actions
- `neutral` - Gray background, for secondary actions
- `ghost` - Transparent background, for subtle actions

#### Sizes

- `sm` - Small (px-3 py-1.5 text-sm)
- `md` - Medium (px-4 py-2 text-base) - Default
- `lg` - Large (px-6 py-3 text-lg)

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'success' | 'danger' | 'neutral' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
}
```

#### Usage Examples

```tsx
// Primary action
<Button variant="primary" onClick={handleSubmit}>
  Add Source
</Button>

// Destructive action
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>

// Loading state
<Button variant="success" loading={isLoading}>
  Saving...
</Button>

// Small secondary action
<Button variant="neutral" size="sm" onClick={handleCancel}>
  Cancel
</Button>
```

---

### Badge Component

**Location:** `/components/ui/badge.tsx`

#### Variants

- `success` - Green background, for success states
- `error` - Red background, for error states
- `warning` - Yellow background, for warning states
- `info` - Blue background, for informational states
- `neutral` - Gray background, for neutral states
- `muted` - Muted gray, for less prominent information

#### Sizes

- `sm` - Small (px-2 py-0.5 text-xs)
- `md` - Medium (px-2.5 py-1 text-sm) - Default

#### Props

```typescript
interface BadgeProps {
  variant: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'muted';
  size?: 'sm' | 'md';
  children: ReactNode;
}
```

#### Usage Examples

```tsx
// Success status
<Badge variant="success">Active</Badge>

// Error status
<Badge variant="error">Failed</Badge>

// Info badge
<Badge variant="info" size="sm">YouTube</Badge>

// Muted status
<Badge variant="muted">Muted</Badge>
```

---

### Spinner Component

**Location:** `/components/ui/spinner.tsx`

#### Variants

- `default` - White spinner for dark backgrounds
- `primary` - Blue spinner
- `success` - Green spinner
- `danger` - Red spinner

#### Sizes

- `sm` - Small (h-4 w-4)
- `md` - Medium (h-6 w-6) - Default
- `lg` - Large (h-8 w-8)
- `xl` - Extra Large (h-12 w-12)

#### Props

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'success' | 'danger';
}
```

#### Usage Examples

```tsx
// Default spinner
<Spinner />

// Large primary spinner
<Spinner size="lg" variant="primary" />

// Small success spinner
<Spinner size="sm" variant="success" />
```

---

## Other Shared Components

### Toast Notification
**Location:** `/components/ui/toast.tsx`
Non-blocking feedback system for user actions.

### Empty State
**Location:** `/components/ui/empty-state.tsx`
Consistent empty states with icon, heading, description, and actions.

### Search
**Location:** `/components/ui/search.tsx`
Universal search component with debouncing and clear functionality.

### Confirm Dialog
**Location:** `/components/ui/confirm-dialog.tsx`
Modal dialog for confirming destructive actions.

### Loading Skeletons
**Location:** `/components/ui/skeletons.tsx`
Skeleton loaders for various content types.

---

## Typography

### Text Hierarchy

- **Page Title:** `text-2xl font-bold text-white`
- **Section Heading:** `text-xl font-semibold text-white`
- **Card Title:** `text-lg font-medium text-white`
- **Body Text:** `text-base text-gray-300`
- **Small Text:** `text-sm text-gray-400`
- **Label Text:** `text-sm font-medium text-gray-300`

---

## Spacing

### Standard Spacing Scale

Follow Tailwind's spacing scale consistently:

- `gap-2` / `space-y-2` - 0.5rem (8px) - Tight spacing within components
- `gap-3` / `space-y-3` - 0.75rem (12px) - Default component spacing
- `gap-4` / `space-y-4` - 1rem (16px) - Section spacing
- `gap-6` / `space-y-6` - 1.5rem (24px) - Large section spacing
- `gap-8` / `space-y-8` - 2rem (32px) - Page section dividers

### Padding Standards

- **Cards:** `p-4` (1rem / 16px)
- **Containers:** `p-6` (1.5rem / 24px)
- **Page Wrapper:** `p-8` (2rem / 32px)

---

## Border Radius

- **Small:** `rounded` (0.25rem / 4px) - Badges, small elements
- **Medium:** `rounded-lg` (0.5rem / 8px) - Buttons, cards (default)
- **Large:** `rounded-xl` (0.75rem / 12px) - Containers, modals
- **Full:** `rounded-full` - Pills, badges, avatars

---

## Animations & Transitions

### Standard Transitions

```css
transition-all duration-200  /* Default for interactive elements */
transition-colors duration-150  /* For color changes only */
transition-transform duration-300  /* For transforms */
```

### Hover States

All interactive elements should have hover states:

```tsx
hover:bg-blue-700  /* Darken by 100 */
hover:scale-105    /* Slight scale for emphasis */
hover:shadow-lg    /* Add shadow for elevation */
```

### Loading States

Use the Button's built-in `loading` prop with spinner animation.

---

## Accessibility

### Focus States

All interactive elements must have visible focus states:

```css
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
```

### Color Contrast

- All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Primary colors chosen for sufficient contrast on dark backgrounds

### ARIA Labels

- Provide `aria-label` for icon-only buttons
- Use `aria-live` regions for dynamic content (toasts)
- Ensure proper heading hierarchy (h1 → h2 → h3)

---

## Dark Mode

HopeScroll uses a dark-first design. All colors are optimized for dark backgrounds.

### Background Colors

- **Page Background:** `bg-gray-950`
- **Card Background:** `bg-gray-900`
- **Elevated Background:** `bg-gray-800`
- **Border Color:** `border-gray-700`

### Text Colors

- **Primary Text:** `text-white`
- **Secondary Text:** `text-gray-300`
- **Tertiary Text:** `text-gray-400`
- **Disabled Text:** `text-gray-600`

---

## Migration Guide

### From Hardcoded Styles

**Before:**
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Click Me
</button>
```

**After:**
```tsx
<Button variant="primary">
  Click Me
</Button>
```

### From Alert/Confirm

**Before:**
```tsx
alert('Source added successfully!');
if (confirm('Are you sure you want to delete?')) {
  handleDelete();
}
```

**After:**
```tsx
const { showToast } = useToast();
showToast({ type: 'success', message: 'Source added successfully!' });

// Use ConfirmDialog component
<ConfirmDialog
  open={showConfirm}
  title="Delete Source"
  message="Are you sure you want to delete this source?"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

---

## Best Practices

1. **Consistency First:** Always use design system components instead of custom inline styles
2. **Semantic Variants:** Choose button/badge variants based on semantic meaning, not appearance
3. **Spacing:** Use standard spacing values (2, 3, 4, 6, 8) for consistency
4. **Loading States:** Always provide loading feedback for async actions
5. **Error Handling:** Use toast notifications for errors, confirm dialogs for destructive actions
6. **Accessibility:** Test with keyboard navigation and screen readers

---

## Component Checklist

When creating new components:

- [ ] Uses design system colors (no hardcoded blue-600, etc.)
- [ ] Implements hover states for interactive elements
- [ ] Has proper focus states (ring-2 ring-blue-500)
- [ ] Includes loading states where applicable
- [ ] Provides ARIA labels for accessibility
- [ ] Uses standard spacing scale
- [ ] Follows typography hierarchy
- [ ] Tested with keyboard navigation
- [ ] Mobile responsive

---

## References

- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **React Accessibility:** https://react.dev/learn/accessibility

---

**Questions or Suggestions?**
Contact the development team or open an issue in the project repository.
