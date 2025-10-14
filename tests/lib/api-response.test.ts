import { describe, it, expect, beforeEach, vi } from 'vitest';
import { successResponse, errorResponse } from '@/lib/api-response';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ExternalApiError,
} from '@/lib/errors';

describe('successResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns success response with default status 200', async () => {
    const data = { id: '123', name: 'Test' };
    const response = successResponse(data);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
    expect(body.timestamp).toBeDefined();
  });

  it('returns success response with custom status code', async () => {
    const data = { id: '123' };
    const response = successResponse(data, 201);

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
  });

  it('includes timestamp in ISO format', async () => {
    const now = new Date('2024-10-14T10:00:00.000Z');
    vi.setSystemTime(now);

    const response = successResponse({ test: true });
    const body = await response.json();

    expect(body.timestamp).toBe('2024-10-14T10:00:00.000Z');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    vi.useRealTimers();
  });

  it('handles different data types correctly', async () => {
    const stringData = 'test string';
    const numberData = 42;
    const arrayData = [1, 2, 3];
    const objectData = { nested: { value: true } };
    const nullData = null;

    const responses = await Promise.all([
      successResponse(stringData).json(),
      successResponse(numberData).json(),
      successResponse(arrayData).json(),
      successResponse(objectData).json(),
      successResponse(nullData).json(),
    ]);

    expect(responses[0].data).toBe(stringData);
    expect(responses[1].data).toBe(numberData);
    expect(responses[2].data).toEqual(arrayData);
    expect(responses[3].data).toEqual(objectData);
    expect(responses[4].data).toBeNull();

    vi.useRealTimers();
  });

  it('response structure is valid', async () => {
    const response = successResponse({ test: true });
    const body = await response.json();

    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    expect(Object.keys(body)).toEqual(['success', 'data', 'timestamp']);

    vi.useRealTimers();
  });
});

describe('errorResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('handles AppError correctly', async () => {
    const error = new AppError('Test error', 'TEST_ERROR', 400, { field: 'test' });
    const response = errorResponse(error);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TEST_ERROR');
    expect(body.error.message).toBe('Test error');
    expect(body.error.details).toEqual({ field: 'test' });
    expect(body.timestamp).toBeDefined();
  });

  it('handles ValidationError correctly', async () => {
    const error = new ValidationError('Invalid email', { field: 'email' });
    const response = errorResponse(error);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid email');
    expect(body.error.details).toEqual({ field: 'email' });
  });

  it('handles NotFoundError correctly', async () => {
    const error = new NotFoundError('User');
    const response = errorResponse(error);

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('User not found');
  });

  it('handles UnauthorizedError correctly', async () => {
    const error = new UnauthorizedError();
    const response = errorResponse(error);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Unauthorized');
  });

  it('handles ExternalApiError correctly', async () => {
    const error = new ExternalApiError('YouTube', 'Rate limited', { retryAfter: 60 });
    const response = errorResponse(error);

    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.error.code).toBe('EXTERNAL_API_ERROR');
    expect(body.error.message).toContain('YouTube');
    expect(body.error.details).toEqual({ retryAfter: 60 });
  });

  it('handles generic Error with default status', async () => {
    const error = new Error('Something went wrong');
    const response = errorResponse(error);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('Something went wrong');
    expect(body.error.details).toBeUndefined();
  });

  it('handles unknown error type', async () => {
    const error = 'string error';
    const response = errorResponse(error);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('uses custom status code when provided', async () => {
    const error = new Error('Custom error');
    const response = errorResponse(error, 503);

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error.message).toBe('Custom error');
  });

  it('AppError status code takes precedence over custom status', async () => {
    const error = new ValidationError('Invalid input');
    const response = errorResponse(error, 500);

    // AppError's statusCode (400) should be used, not the custom 500
    expect(response.status).toBe(400);
  });

  it('includes timestamp in ISO format', async () => {
    const now = new Date('2024-10-14T10:00:00.000Z');
    vi.setSystemTime(now);

    const error = new Error('Test');
    const response = errorResponse(error);
    const body = await response.json();

    expect(body.timestamp).toBe('2024-10-14T10:00:00.000Z');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    vi.useRealTimers();
  });

  it('response structure is valid', async () => {
    const error = new Error('Test');
    const response = errorResponse(error);
    const body = await response.json();

    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('timestamp');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');

    vi.useRealTimers();
  });

  it('handles errors without details', async () => {
    const error = new AppError('Test', 'TEST', 500);
    const response = errorResponse(error);
    const body = await response.json();

    expect(body.error.details).toBeUndefined();
  });
});

describe('response format consistency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('success and error responses have consistent timestamp format', async () => {
    const now = new Date('2024-10-14T10:00:00.000Z');
    vi.setSystemTime(now);

    const successRes = await successResponse({ test: true }).json();
    const errorRes = await errorResponse(new Error('test')).json();

    expect(successRes.timestamp).toBe(errorRes.timestamp);
    expect(successRes.timestamp).toBe('2024-10-14T10:00:00.000Z');

    vi.useRealTimers();
  });

  it('both responses include success field', async () => {
    const successRes = await successResponse({ test: true }).json();
    const errorRes = await errorResponse(new Error('test')).json();

    expect(successRes).toHaveProperty('success');
    expect(errorRes).toHaveProperty('success');
    expect(successRes.success).toBe(true);
    expect(errorRes.success).toBe(false);

    vi.useRealTimers();
  });
});
