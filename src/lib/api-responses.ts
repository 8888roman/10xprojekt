import type { ErrorResponseDto } from '../types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const jsonResponse = <T>(data: T, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

type ErrorResponseParams = {
  status: number;
  error: string;
  message: string;
  code: ErrorResponseDto['code'];
  details?: ErrorResponseDto['details'];
};

export const errorResponse = ({
  status,
  error,
  message,
  code,
  details = [],
}: ErrorResponseParams) =>
  jsonResponse<ErrorResponseDto>(
    {
      error,
      message,
      code,
      details,
    },
    status,
  );

export const validationErrorResponse = (
  message: string,
  details: ErrorResponseDto['details'] = [],
) =>
  errorResponse({
    status: 400,
    error: 'Bad Request',
    message,
    code: 'VALIDATION_ERROR',
    details,
  });

export const unauthorizedResponse = (message = 'Unauthorized') =>
  errorResponse({
    status: 401,
    error: 'Unauthorized',
    message,
    code: 'UNAUTHORIZED',
  });

export const rateLimitedResponse = (message = 'Too many requests') =>
  errorResponse({
    status: 429,
    error: 'Too Many Requests',
    message,
    code: 'RATE_LIMITED',
  });

export const internalErrorResponse = (message = 'Internal server error') =>
  errorResponse({
    status: 500,
    error: 'Internal Server Error',
    message,
    code: 'INTERNAL_ERROR',
  });
