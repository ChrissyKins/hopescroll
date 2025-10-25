// Standard API response format
import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { createLogger } from './logger';

const log = createLogger('api-response');

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function errorResponse(error: unknown, status?: number): NextResponse<ApiError> {
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let statusCode = status || 500;
  let details: unknown = undefined;

  if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    statusCode = error.statusCode;
    details = error.details;
  } else if ((error as any)?.name === 'ZodError') {
    // Handle Zod validation errors
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    statusCode = 400;
    details = (error as any).errors;
  } else if (error instanceof Error) {
    message = error.message;
  }

  log.error({ error, code, message, statusCode }, 'API error');

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
