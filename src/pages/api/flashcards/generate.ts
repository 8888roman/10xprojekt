import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import type { CreateGenerationErrorLogCommand, GenerateFlashcardsResponseDto } from '../../../types';
import {
  errorResponse,
  internalErrorResponse,
  jsonResponse,
  rateLimitedResponse,
  validationErrorResponse,
} from '../../../lib/api-responses';
import { generateFlashcardsSchema } from '../../../lib/schemas/flashcards';
import { checkRateLimit } from '../../../lib/rate-limit';
import { generateFlashcardProposals, LlmServiceError } from '../../../lib/services/flashcard-generate';
import type { Database } from '../../../db/database.types';

export const prerender = false;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const DEFAULT_LLM_MODEL = import.meta.env.LLM_MODEL ?? 'mock';

const getAccessToken = (context: Parameters<APIRoute>[0]) => {
  const authHeader = context.request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return context.cookies.get('sb-access-token')?.value ?? null;
};

const getRefreshToken = (context: Parameters<APIRoute>[0]) =>
  context.cookies.get('sb-refresh-token')?.value ?? null;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
};

export const POST: APIRoute = async (context) => {
  const accessToken = getAccessToken(context);
  const supabase = context.locals.supabase;
  const refreshToken = getRefreshToken(context);
  let userId: string | null = null;

  if (accessToken) {
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (!userError && userData.user) {
      userId = userData.user.id;
    }
  }

  const requestKey = userId ?? context.clientAddress ?? 'anonymous';
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
      let logPayload: CreateGenerationErrorLogCommand | null = null;

      try {
        logPayload = {
          model: DEFAULT_LLM_MODEL,
          source_text_hash: await sha256Hex(text),
          source_text_length: text.length,
          error_code: error.code,
          error_message: error.message,
        };
      } catch (hashError) {
        console.warn('Failed to hash text for LLM error log', hashError);
      }

      try {
        let logClient = supabase;

        if (accessToken) {
          if (refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              logClient = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
                auth: { persistSession: false },
                global: { headers: { Authorization: `Bearer ${accessToken}` } },
              });
            }
          } else {
            logClient = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
              auth: { persistSession: false },
              global: { headers: { Authorization: `Bearer ${accessToken}` } },
            });
          }
        }

        if (userId && logPayload && accessToken) {
          await logClient.from('generation_error_logs').insert({
            ...logPayload,
            user_id: userId,
          });
        }
      } catch (logError) {
        console.warn('Failed to log LLM error', logError);
      }

      return errorResponse({
        status: error.status,
        error: error.status === 502 ? 'Bad Gateway' : 'Service Unavailable',
        message: error.message,
        code: 'INTERNAL_ERROR',
      });
    }

    return internalErrorResponse('Unexpected server error.');
  }
};
