import type { APIRoute } from 'astro';
import type { FlashcardListResponseDto } from '../../../types';
import {
  internalErrorResponse,
  jsonResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { ensureAuthenticated } from '../../../lib/auth';
import { flashcardListQuerySchema } from '../../../lib/schemas/flashcards';
import { listFlashcards } from '../../../lib/services/flashcards';

export const prerender = false;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT = 'created_at';
const DEFAULT_ORDER = 'desc';

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const authResult = await ensureAuthenticated(context, supabase);

  if (!authResult.ok) {
    return authResult.response;
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
