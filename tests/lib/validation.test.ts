import { describe, it, expect } from 'vitest';
import {
  addSourceSchema,
  updateSourceSchema,
  addFilterSchema,
  watchContentSchema,
  saveContentSchema,
  dismissContentSchema,
  updatePreferencesSchema,
  registerSchema,
  loginSchema,
} from '@/lib/validation';

describe('addSourceSchema', () => {
  it('accepts valid YouTube source', () => {
    const result = addSourceSchema.safeParse({
      type: 'YOUTUBE',
      sourceId: 'UC123456789',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid Twitch source', () => {
    const result = addSourceSchema.safeParse({
      type: 'TWITCH',
      sourceId: 'channelname',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid RSS source', () => {
    const result = addSourceSchema.safeParse({
      type: 'RSS',
      sourceId: 'https://example.com/feed',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid Podcast source', () => {
    const result = addSourceSchema.safeParse({
      type: 'PODCAST',
      sourceId: 'podcast-id',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid source type', () => {
    const result = addSourceSchema.safeParse({
      type: 'INVALID',
      sourceId: 'test',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty sourceId', () => {
    const result = addSourceSchema.safeParse({
      type: 'YOUTUBE',
      sourceId: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Source ID is required');
    }
  });

  it('rejects missing sourceId', () => {
    const result = addSourceSchema.safeParse({
      type: 'YOUTUBE',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = addSourceSchema.safeParse({
      sourceId: 'test',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateSourceSchema', () => {
  it('accepts isMuted as true', () => {
    const result = updateSourceSchema.safeParse({
      isMuted: true,
    });

    expect(result.success).toBe(true);
  });

  it('accepts isMuted as false', () => {
    const result = updateSourceSchema.safeParse({
      isMuted: false,
    });

    expect(result.success).toBe(true);
  });

  it('accepts alwaysSafe as boolean', () => {
    const result = updateSourceSchema.safeParse({
      alwaysSafe: true,
    });

    expect(result.success).toBe(true);
  });

  it('accepts both fields together', () => {
    const result = updateSourceSchema.safeParse({
      isMuted: true,
      alwaysSafe: false,
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateSourceSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects non-boolean isMuted', () => {
    const result = updateSourceSchema.safeParse({
      isMuted: 'true',
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-boolean alwaysSafe', () => {
    const result = updateSourceSchema.safeParse({
      alwaysSafe: 1,
    });

    expect(result.success).toBe(false);
  });
});

describe('addFilterSchema', () => {
  it('accepts valid keyword', () => {
    const result = addFilterSchema.safeParse({
      keyword: 'spoiler',
    });

    expect(result.success).toBe(true);
  });

  it('accepts keyword with isWildcard true', () => {
    const result = addFilterSchema.safeParse({
      keyword: 'test*',
      isWildcard: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isWildcard).toBe(true);
    }
  });

  it('defaults isWildcard to false when not provided', () => {
    const result = addFilterSchema.safeParse({
      keyword: 'test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isWildcard).toBe(false);
    }
  });

  it('rejects empty keyword', () => {
    const result = addFilterSchema.safeParse({
      keyword: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Keyword cannot be empty');
    }
  });

  it('rejects missing keyword', () => {
    const result = addFilterSchema.safeParse({
      isWildcard: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('watchContentSchema', () => {
  it('accepts valid watchDuration', () => {
    const result = watchContentSchema.safeParse({
      watchDuration: 120,
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid completionRate', () => {
    const result = watchContentSchema.safeParse({
      completionRate: 0.75,
    });

    expect(result.success).toBe(true);
  });

  it('accepts both watchDuration and completionRate', () => {
    const result = watchContentSchema.safeParse({
      watchDuration: 300,
      completionRate: 0.5,
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = watchContentSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects negative watchDuration', () => {
    const result = watchContentSchema.safeParse({
      watchDuration: -10,
    });

    expect(result.success).toBe(false);
  });

  it('accepts zero watchDuration', () => {
    const result = watchContentSchema.safeParse({
      watchDuration: 0,
    });

    expect(result.success).toBe(true);
  });

  it('rejects completionRate greater than 1', () => {
    const result = watchContentSchema.safeParse({
      completionRate: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative completionRate', () => {
    const result = watchContentSchema.safeParse({
      completionRate: -0.1,
    });

    expect(result.success).toBe(false);
  });

  it('accepts completionRate of 0', () => {
    const result = watchContentSchema.safeParse({
      completionRate: 0,
    });

    expect(result.success).toBe(true);
  });

  it('accepts completionRate of 1', () => {
    const result = watchContentSchema.safeParse({
      completionRate: 1,
    });

    expect(result.success).toBe(true);
  });
});

describe('saveContentSchema', () => {
  it('accepts collection name', () => {
    const result = saveContentSchema.safeParse({
      collection: 'Watch Later',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (collection is optional)', () => {
    const result = saveContentSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects non-string collection', () => {
    const result = saveContentSchema.safeParse({
      collection: 123,
    });

    expect(result.success).toBe(false);
  });
});

describe('dismissContentSchema', () => {
  it('accepts reason', () => {
    const result = dismissContentSchema.safeParse({
      reason: 'Not interested',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (reason is optional)', () => {
    const result = dismissContentSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects non-string reason', () => {
    const result = dismissContentSchema.safeParse({
      reason: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('updatePreferencesSchema', () => {
  it('accepts valid minDuration', () => {
    const result = updatePreferencesSchema.safeParse({
      minDuration: 300,
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid maxDuration', () => {
    const result = updatePreferencesSchema.safeParse({
      maxDuration: 3600,
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid backlogRatio', () => {
    const result = updatePreferencesSchema.safeParse({
      backlogRatio: 0.3,
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid diversityLimit', () => {
    const result = updatePreferencesSchema.safeParse({
      diversityLimit: 5,
    });

    expect(result.success).toBe(true);
  });

  it('accepts theme light', () => {
    const result = updatePreferencesSchema.safeParse({
      theme: 'light',
    });

    expect(result.success).toBe(true);
  });

  it('accepts theme dark', () => {
    const result = updatePreferencesSchema.safeParse({
      theme: 'dark',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid theme', () => {
    const result = updatePreferencesSchema.safeParse({
      theme: 'blue',
    });

    expect(result.success).toBe(false);
  });

  it('accepts density compact', () => {
    const result = updatePreferencesSchema.safeParse({
      density: 'compact',
    });

    expect(result.success).toBe(true);
  });

  it('accepts density cozy', () => {
    const result = updatePreferencesSchema.safeParse({
      density: 'cozy',
    });

    expect(result.success).toBe(true);
  });

  it('accepts density comfortable', () => {
    const result = updatePreferencesSchema.safeParse({
      density: 'comfortable',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid density', () => {
    const result = updatePreferencesSchema.safeParse({
      density: 'wide',
    });

    expect(result.success).toBe(false);
  });

  it('accepts autoPlay boolean', () => {
    const result = updatePreferencesSchema.safeParse({
      autoPlay: true,
    });

    expect(result.success).toBe(true);
  });

  it('accepts all fields together', () => {
    const result = updatePreferencesSchema.safeParse({
      minDuration: 300,
      maxDuration: 3600,
      backlogRatio: 0.3,
      diversityLimit: 5,
      theme: 'dark',
      density: 'comfortable',
      autoPlay: false,
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updatePreferencesSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects negative minDuration', () => {
    const result = updatePreferencesSchema.safeParse({
      minDuration: -100,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative maxDuration', () => {
    const result = updatePreferencesSchema.safeParse({
      maxDuration: -100,
    });

    expect(result.success).toBe(false);
  });

  it('rejects backlogRatio greater than 1', () => {
    const result = updatePreferencesSchema.safeParse({
      backlogRatio: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative backlogRatio', () => {
    const result = updatePreferencesSchema.safeParse({
      backlogRatio: -0.1,
    });

    expect(result.success).toBe(false);
  });

  it('rejects diversityLimit less than 1', () => {
    const result = updatePreferencesSchema.safeParse({
      diversityLimit: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects diversityLimit greater than 10', () => {
    const result = updatePreferencesSchema.safeParse({
      diversityLimit: 11,
    });

    expect(result.success).toBe(false);
  });

  it('accepts diversityLimit of 1', () => {
    const result = updatePreferencesSchema.safeParse({
      diversityLimit: 1,
    });

    expect(result.success).toBe(true);
  });

  it('accepts diversityLimit of 10', () => {
    const result = updatePreferencesSchema.safeParse({
      diversityLimit: 10,
    });

    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  it('accepts valid email and password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'securePassword123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      email: 'notanemail',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
    }
  });

  it('accepts password with exactly 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'pass1234',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'notanemail',
      password: 'password',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address');
    }
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password is required');
    }
  });

  it('accepts short password (login allows any length)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'x',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);
  });
});
