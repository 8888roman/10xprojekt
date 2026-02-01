import type { APIRoute } from 'astro';

import { unauthorizedResponse } from './api-responses';

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
  supabase: Parameters<APIRoute>[0]['locals']['supabase'],
  accessToken: string,
  refreshToken: string | null,
) => {
  if (refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return;
  }

  const setAuth = (
    supabase.auth as { setAuth?: (token: string) => Promise<void> | void }
  ).setAuth;

  if (setAuth) {
    await setAuth(accessToken);
  }
};

export const requireApiUser = async (context: Parameters<APIRoute>[0]) => {
  const supabase = context.locals.supabase;
  const accessToken = getAccessToken(context);
  const refreshToken = getRefreshToken(context);

  if (!accessToken) {
    return { ok: false as const, response: unauthorizedResponse('Missing access token.') };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { ok: false as const, response: unauthorizedResponse('Invalid or expired token.') };
  }

  await setSupabaseSession(supabase, accessToken, refreshToken);

  return { ok: true as const, userId: userData.user.id };
};
