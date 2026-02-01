import type { APIRoute } from 'astro';

import {
  internalErrorResponse,
  jsonResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { registerSchema } from '../../../lib/schemas/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
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

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse('Validation failed.', parsed.error.issues);
  }

  const { email, password } = parsed.data;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return validationErrorResponse('Nie udalo sie utworzyc konta.');
    }

    const requiresVerification = !data.session;

    return jsonResponse(
      {
        status: requiresVerification ? 'verification_required' : 'authenticated',
      },
      requiresVerification ? 200 : 201,
    );
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};
