import type { APIRoute } from 'astro';
import type { CreateFlashcardCommand, FlashcardListResponseDto } from '../../../types';
import {
  internalErrorResponse,
  jsonResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { ensureAuthenticated } from '../../../lib/auth';
import { createFlashcardSchema, flashcardListQuerySchema } from '../../../lib/schemas/flashcards';
import { createFlashcard, listFlashcards } from '../../../lib/services/flashcards';

export const prerender = false;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT = 'created_at';
const DEFAULT_ORDER = 'desc';

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const auth = await ensureAuthenticated(context, supabase);

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(context.request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const parsedQuery = flashcardListQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    return validationErrorResponse('Validation failed.', parsedQuery.error.issues);
  }

  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    source,
    generation_id,
    sort = DEFAULT_SORT,
    order = DEFAULT_ORDER,
  } = parsedQuery.data;

  try {
    const { data, count, error } = await listFlashcards(supabase, {
      page,
      limit,
      source,
      generation_id,
      sort,
      order,
    });

    if (error) {
      return internalErrorResponse('Failed to load flashcards.');
    }

    const responseBody: FlashcardListResponseDto = {
      data: data ?? [],
      meta: {
        page,
        limit,
        total: count ?? 0,
      },
    };

    return jsonResponse(responseBody, 200);
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const auth = await ensureAuthenticated(context, supabase);

  if (!auth.ok) {
    return auth.response;
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

  const parsed = createFlashcardSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse('Validation failed.', parsed.error.issues);
  }

  const payload: CreateFlashcardCommand = parsed.data;

  try {
    const { data, error } = await createFlashcard(supabase, payload, auth.userId);

    if (error) {
      return internalErrorResponse('Failed to create flashcard.');
    }

    if (!data) {
      return internalErrorResponse('Flashcard was not created.');
    }

    return jsonResponse(data, 201);
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};
