import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ExternalApiError,
  RateLimitError,
} from '@/lib/errors';

describe('AppError', () => {
  it('creates error with all properties', () => {
    const error = new AppError('Test error', 'TEST_CODE', 500, { key: 'value' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('AppError');
  });

  it('uses default status code when not provided', () => {
    const error = new AppError('Test error', 'TEST_CODE');

    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
  });

  it('is instance of Error', () => {
    const error = new AppError('Test error', 'TEST_CODE');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('includes stack trace', () => {
    const error = new AppError('Test error', 'TEST_CODE');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('ValidationError', () => {
  it('creates validation error with message', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('includes validation details', () => {
    const details = { field: 'email', issue: 'invalid format' };
    const error = new ValidationError('Invalid email', details);

    expect(error.details).toEqual(details);
  });

  it('is instance of AppError', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('can be caught as AppError', () => {
    try {
      throw new ValidationError('Invalid input');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.statusCode).toBe(400);
      }
    }
  });
});

describe('NotFoundError', () => {
  it('creates not found error with resource name', () => {
    const error = new NotFoundError('User');

    expect(error.message).toBe('User not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });

  it('formats different resource names correctly', () => {
    const userError = new NotFoundError('User');
    const contentError = new NotFoundError('Content item');
    const sourceError = new NotFoundError('Source');

    expect(userError.message).toBe('User not found');
    expect(contentError.message).toBe('Content item not found');
    expect(sourceError.message).toBe('Source not found');
  });

  it('is instance of AppError', () => {
    const error = new NotFoundError('Resource');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});

describe('UnauthorizedError', () => {
  it('creates unauthorized error with default message', () => {
    const error = new UnauthorizedError();

    expect(error.message).toBe('Unauthorized');
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('UnauthorizedError');
  });

  it('accepts custom message', () => {
    const error = new UnauthorizedError('Invalid token');

    expect(error.message).toBe('Invalid token');
    expect(error.statusCode).toBe(401);
  });

  it('is instance of AppError', () => {
    const error = new UnauthorizedError();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });
});

describe('ForbiddenError', () => {
  it('creates forbidden error with default message', () => {
    const error = new ForbiddenError();

    expect(error.message).toBe('Forbidden');
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('ForbiddenError');
  });

  it('accepts custom message', () => {
    const error = new ForbiddenError('Insufficient permissions');

    expect(error.message).toBe('Insufficient permissions');
    expect(error.statusCode).toBe(403);
  });

  it('is instance of AppError', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ForbiddenError);
  });
});

describe('ExternalApiError', () => {
  it('creates external API error with service and message', () => {
    const error = new ExternalApiError('YouTube', 'API quota exceeded');

    expect(error.message).toBe('External API error (YouTube): API quota exceeded');
    expect(error.code).toBe('EXTERNAL_API_ERROR');
    expect(error.statusCode).toBe(502);
    expect(error.name).toBe('ExternalApiError');
  });

  it('includes error details', () => {
    const details = { statusCode: 429, response: 'Quota exceeded' };
    const error = new ExternalApiError('YouTube', 'Rate limited', details);

    expect(error.details).toEqual(details);
  });

  it('formats different service names correctly', () => {
    const youtubeError = new ExternalApiError('YouTube', 'Failed to fetch');
    const twitterError = new ExternalApiError('Twitter', 'Connection timeout');

    expect(youtubeError.message).toBe('External API error (YouTube): Failed to fetch');
    expect(twitterError.message).toBe('External API error (Twitter): Connection timeout');
  });

  it('is instance of AppError', () => {
    const error = new ExternalApiError('YouTube', 'Error');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ExternalApiError);
  });
});

describe('RateLimitError', () => {
  it('creates rate limit error with default message', () => {
    const error = new RateLimitError();

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.name).toBe('RateLimitError');
  });

  it('accepts custom message', () => {
    const error = new RateLimitError('Too many requests. Try again in 60 seconds');

    expect(error.message).toBe('Too many requests. Try again in 60 seconds');
    expect(error.statusCode).toBe(429);
  });

  it('is instance of AppError', () => {
    const error = new RateLimitError();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(RateLimitError);
  });
});

describe('Error inheritance and instanceof checks', () => {
  it('all custom errors are instances of Error', () => {
    const errors = [
      new AppError('test', 'TEST'),
      new ValidationError('test'),
      new NotFoundError('test'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new ExternalApiError('service', 'test'),
      new RateLimitError(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('all custom errors are instances of AppError', () => {
    const errors = [
      new ValidationError('test'),
      new NotFoundError('test'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new ExternalApiError('service', 'test'),
      new RateLimitError(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(AppError);
    });
  });

  it('errors have correct status codes for API responses', () => {
    const statusCodes = [
      { error: new ValidationError('test'), expected: 400 },
      { error: new UnauthorizedError(), expected: 401 },
      { error: new ForbiddenError(), expected: 403 },
      { error: new NotFoundError('test'), expected: 404 },
      { error: new RateLimitError(), expected: 429 },
      { error: new AppError('test', 'TEST', 500), expected: 500 },
      { error: new ExternalApiError('service', 'test'), expected: 502 },
    ];

    statusCodes.forEach(({ error, expected }) => {
      expect(error.statusCode).toBe(expected);
    });
  });
});
