// Input validation schemas with Zod
import { z } from 'zod';

// Source validation
export const addSourceSchema = z.object({
  type: z.enum(['YOUTUBE', 'TWITCH', 'RSS', 'PODCAST']),
  sourceId: z.string().min(1, 'Source ID is required'),
});

export const updateSourceSchema = z.object({
  isMuted: z.boolean().optional(),
  alwaysSafe: z.boolean().optional(),
});

// Filter validation
export const addFilterSchema = z.object({
  keyword: z.string().min(1, 'Keyword cannot be empty'),
  isWildcard: z.boolean().default(false),
});

// Content interaction validation
export const watchContentSchema = z.object({
  watchDuration: z.number().min(0).optional(),
  completionRate: z.number().min(0).max(1).optional(),
});

export const saveContentSchema = z.object({
  collection: z.string().optional(),
});

export const dismissContentSchema = z.object({
  reason: z.string().optional(),
});

// Preferences validation
export const updatePreferencesSchema = z.object({
  minDuration: z.number().min(0).optional(),
  maxDuration: z.number().min(0).optional(),
  backlogRatio: z.number().min(0).max(1).optional(),
  diversityLimit: z.number().min(1).max(10).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  density: z.enum(['compact', 'cozy', 'comfortable']).optional(),
  autoPlay: z.boolean().optional(),
});

// User registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// User login
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
