import type { APIRoute } from 'astro';

import {
  errorResponse,
  internalErrorResponse,
  jsonResponse,
  rateLimitedResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { checkRateLimit } from '../../../lib/rate-limit';
import { openRouterChatSchema } from '../../../lib/schemas/openrouter';
import { OpenRouterService, OpenRouterServiceError } from '../../../lib/services/openrouter';
import type { JsonSchema } from '../../../types';

export const prerender = false;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const getTimeoutMs = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: import.meta.env.OPENROUTER_BASE_URL,
  defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4.1-mini',
  timeoutMs: getTimeoutMs(import.meta.env.OPENROUTER_TIMEOUT_MS),
  appName: import.meta.env.OPENROUTER_APP_NAME,
  appUrl: import.meta.env.OPENROUTER_APP_URL,
});

export const POST: APIRoute = async (context) => {
  const requestKey = context.clientAddress ?? 'anonymous';
  const rateLimit = checkRateLimit(requestKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

  if (!rateLimit.allowed) {
    return rateLimitedResponse('Rate limit exceeded. Try again later.');
  }

  let body: unknown;

  try {
    body = await context.request.json();
  } catch (error) {
    return validationErrorResponse('Invalid JSON body.', [
      { message: error instanceof Error ? error.message : 'Unable to parse JSON.' },
    ]);
  }

  if (!body || typeof body !== 'object') {
    return validationErrorResponse('Request body must be a JSON object.');
  }

  const parsed = openRouterChatSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse('Validation failed.', parsed.error.issues);
  }

  const { schema, ...input } = parsed.data;

  try {
    if (schema) {
      const result = await openRouterService.createStructuredCompletion(input, schema as JsonSchema);
      return jsonResponse(
        {
          data: result.data,
          model: result.model,
          requestId: result.requestId,
          finishReason: result.finishReason,
        },
        200,
      );
    }

    const result = await openRouterService.createChatCompletion(input);
    return jsonResponse(
      {
        content: result.content,
        model: result.model,
        requestId: result.requestId,
        finishReason: result.finishReason,
      },
      200,
    );
  } catch (error) {
    if (error instanceof OpenRouterServiceError) {
      const status = error.status ?? (error.retryable ? 503 : 502);
      return errorResponse({
        status,
        error: status === 503 ? 'Service Unavailable' : 'Bad Gateway',
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: error.details ?? [],
      });
    }

    return internalErrorResponse('Unexpected server error.');
  }
};
