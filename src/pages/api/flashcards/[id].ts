import type { APIRoute } from 'astro';
import { deleteFlashcard } from '../../../lib/services/flashcards';
import {
  errorResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { flashcardIdParamSchema } from '../../../lib/schemas/flashcards';

export const prerender = false;

const getAccessToken = (context: Parameters<APIRoute>[0]) => {
  const authHeader = context.request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return context.cookies.get('sb-access-token')?.value ?? null;
};

export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const accessToken = getAccessToken(context);

  if (!accessToken) {
    return unauthorizedResponse('Missing access token.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return unauthorizedResponse('Invalid or expired token.');
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
        return errorResponse({
          status: 404,
          error: 'Not Found',
          message: 'Flashcard not found.',
          code: 'NOT_FOUND',
        });
      }

      return internalErrorResponse('Failed to delete flashcard.');
    }

    if (!data) {
      return errorResponse({
        status: 404,
        error: 'Not Found',
        message: 'Flashcard not found.',
        code: 'NOT_FOUND',
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};
