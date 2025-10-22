/**
 * SVG Icon Components using Heroicons
 *
 * Centralized icon exports for consistent usage across the app.
 * All icons are from @heroicons/react/24/outline for a consistent look.
 */

import {
  VideoCameraIcon,
  ClockIcon,
  SignalIcon,
  ShieldCheckIcon,
  StarIcon,
  DocumentTextIcon,
  EyeIcon,
  XMarkIcon,
  PauseIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

// Export icons with semantic names for easy reference

// Sources page icons
export const VideoIcon = VideoCameraIcon;  // For fetched videos count
export const UnwatchedIcon = ClockIcon;    // For unwatched videos count

// Empty state icons
export const SourceIcon = SignalIcon;      // Sources page empty state
export const ShieldIcon = ShieldCheckIcon; // Filters page empty state
export const SavedIcon = StarIcon;         // Saved page empty state
export const HistoryIcon = DocumentTextIcon; // History page empty state

// History interaction icons
export const WatchedIcon = EyeIcon;        // Watched videos
export { StarIcon };                       // Saved videos (reuse)
export const DismissedIcon = XMarkIcon;    // Dismissed content
export const NotNowIcon = PauseIcon;       // Not now (saved for later)
export const BlockedIcon = NoSymbolIcon;   // Blocked content
