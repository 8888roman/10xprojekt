import type { APIRoute } from 'astro';

import type { CreateGenerationCommand } from '../../../types';
import {
  internalErrorResponse,
  jsonResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { requireApiUser } from '../../../lib/api-auth';
import { createGenerationSchema } from '../../../lib/schemas/generations';
import { createGeneration } from '../../../lib/services/generations';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const auth = await requireApiUser(context);

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

  const parsed = createGenerationSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse('Validation failed.', parsed.error.issues);
  }

  const payload: CreateGenerationCommand = parsed.data;

  try {
    const { data, error } = await createGeneration(supabase, payload, auth.userId);

    if (error) {
      return internalErrorResponse('Failed to create generation.');
    }

    if (!data) {
      return internalErrorResponse('Generation was not created.');
    }

    return jsonResponse({ id: data.id }, 201);
  } catch (error) {
    return internalErrorResponse('Unexpected server error.');
  }
};
