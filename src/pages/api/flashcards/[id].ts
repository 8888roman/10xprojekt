import type { APIRoute } from 'astro';
import { deleteFlashcard } from '../../../lib/services/flashcards';
import {
  errorResponse,
  internalErrorResponse,
  notFoundResponse,
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

const getRefreshToken = (context: Parameters<APIRoute>[0]) =>
  context.cookies.get('sb-refresh-token')?.value ?? null;

export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const accessToken = getAccessToken(context);
  const refreshToken = getRefreshToken(context);

  if (!accessToken) {
    return unauthorizedResponse('Missing access token.');
  }

  if (refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      return unauthorizedResponse('Invalid or expired token.');
    }
  } else {
    const setAuth = (
      supabase.auth as { setAuth?: (token: string) => Promise<void> | void }
    ).setAuth;

    if (setAuth) {
      try {
        await setAuth(accessToken);
      } catch (error) {
        return unauthorizedResponse('Invalid or expired token.');
      }
    }
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
