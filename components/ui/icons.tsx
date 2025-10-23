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
  FolderIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightIcon,
  FunnelIcon,
  Bars3Icon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowsUpDownIcon,
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

// Collection management icons
export const CollectionIcon = FolderIcon; // Collection folder icon
export { PlusIcon };                       // Add new collection
export { PencilIcon };                     // Edit icon
export const EditIcon = PencilIcon;        // Edit collection
export { TrashIcon };                      // Delete collection
export { ChevronDownIcon };                // Dropdown indicator
export { CheckIcon };                      // Check/confirm icon
export { XMarkIcon };                      // Close/cancel icon
export { ArrowRightIcon };                 // Arrow right icon

// Filter and sort icons
export const FilterIcon = FunnelIcon;      // Filter dropdown
export const SortIcon = ArrowsUpDownIcon;  // Sort dropdown
export const GridIcon = Squares2X2Icon;    // Grid view
export const ListIcon = ListBulletIcon;    // List view
export const CompactIcon = Bars3Icon;      // Compact view
