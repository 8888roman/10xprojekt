import type { APIRoute } from 'astro';
import {
  errorResponse,
  internalErrorResponse,
  jsonResponse,
  notFoundResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { ensureAuthenticated } from '../../../lib/auth';
import { getFlashcardById, deleteFlashcard } from '../../../lib/services/flashcards';
import { flashcardIdParamSchema } from '../../../lib/schemas/flashcards';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const authResult = await ensureAuthenticated(context, supabase);

  if (!authResult.ok) {
    return authResult.response;
  }

  const parsedParams = flashcardIdParamSchema.safeParse({ id: context.params.id });

  if (!parsedParams.success) {
    return validationErrorResponse('Validation failed.', parsedParams.error.issues);
  }

  const { id } = parsedParams.data;

  try {
    const { data, error } = await getFlashcardById(supabase, id);

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Flashcard not found.');
      }

      return internalErrorResponse('Failed to load flashcard.');
    }

    if (!data) {
      return notFoundResponse('Flashcard not found.');
    }

    return jsonResponse(data, 200);
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};

export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const authResult = await ensureAuthenticated(context, supabase);

  if (!authResult.ok) {
    return authResult.response;
  }

  const parsedParams = flashcardIdParamSchema.safeParse({ id: context.params.id });

  if (!parsedParams.success) {
    return validationErrorResponse('Validation failed.', parsedParams.error.issues);
  }

  const { id } = parsedParams.data;

  try {
    const { data, error } = await deleteFlashcard(supabase, id);

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Flashcard not found.');
      }

      return internalErrorResponse('Failed to delete flashcard.');
    }

    if (!data) {
      return notFoundResponse('Flashcard not found.');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};
