import type { APIRoute } from 'astro';
import type { SupabaseClient } from '../db/supabase.client';
import { unauthorizedResponse } from './api-responses';

type AuthResult =
  | { ok: true; accessToken: string }
  | { ok: false; response: Response };

const getAccessToken = (context: Parameters<APIRoute>[0]) => {
  const authHeader = context.request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return context.cookies.get('sb-access-token')?.value ?? null;
};

const getRefreshToken = (context: Parameters<APIRoute>[0]) =>
  context.cookies.get('sb-refresh-token')?.value ?? null;

const setSupabaseSession = async (
  supabase: SupabaseClient,
  accessToken: string,
  refreshToken: string | null,
) => {
  if (refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      return false;
    }

    return true;
  }

  const setAuth = (
    supabase.auth as { setAuth?: (token: string) => Promise<void> | void }
  ).setAuth;

  if (!setAuth) {
    return true;
  }

  try {
    await setAuth(accessToken);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Ensures a valid Supabase session and user for the current request.
 */
export const ensureAuthenticated = async (
  context: Parameters<APIRoute>[0],
  supabase: SupabaseClient,
): Promise<AuthResult> => {
  const accessToken = getAccessToken(context);
  const refreshToken = getRefreshToken(context);

  if (!accessToken) {
    return { ok: false, response: unauthorizedResponse('Missing access token.') };
  }

  const sessionReady = await setSupabaseSession(supabase, accessToken, refreshToken);

  if (!sessionReady) {
    return { ok: false, response: unauthorizedResponse('Invalid or expired token.') };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { ok: false, response: unauthorizedResponse('Invalid or expired token.') };
  }

  return { ok: true, accessToken };
};
