import type { APIRoute } from 'astro';
import type { GenerateFlashcardsResponseDto } from '../../../types';
import { jsonResponse, errorResponse, rateLimitedResponse, validationErrorResponse } from '../../../lib/api-responses';
import { generateFlashcardsSchema } from '../../../lib/schemas/flashcards';
import { checkRateLimit } from '../../../lib/rate-limit';
import { generateFlashcardProposals, LlmServiceError } from '../../../lib/services/flashcard-generate';

export const prerender = false;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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

  const parsed = generateFlashcardsSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse('Validation failed.', parsed.error.issues);
  }

  const { text } = parsed.data;

  try {
    const proposals = await generateFlashcardProposals(text);
    const responseBody: GenerateFlashcardsResponseDto = { proposals };

    return jsonResponse(responseBody, 200);
  } catch (error) {
    if (error instanceof LlmServiceError) {
      return errorResponse({
        status: error.status,
        error: 'Bad Gateway',
        message: error.message,
        code: 'INTERNAL_ERROR',
      });
    }

    return errorResponse({
      status: 500,
      error: 'Internal Server Error',
      message: 'Unexpected server error.',
      code: 'INTERNAL_ERROR',
    });
  }
};
