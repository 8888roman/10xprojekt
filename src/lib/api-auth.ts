import type { APIRoute } from "astro";

import { unauthorizedResponse } from "./api-responses";

const getBearerToken = (context: Parameters<APIRoute>[0]) => {
  const authHeader = context.request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
};

const setAuthToken = async (supabase: Parameters<APIRoute>[0]["locals"]["supabase"], token: string) => {
  const setAuth = (supabase.auth as { setAuth?: (token: string) => Promise<void> | void }).setAuth;

  if (setAuth) {
    await setAuth(token);
  }
};

export const requireApiUser = async (context: Parameters<APIRoute>[0]) => {
  const supabase = context.locals.supabase;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user && !error) {
    return { ok: true as const, userId: user.id };
  }

  const bearerToken = getBearerToken(context);

  if (!bearerToken) {
    return { ok: false as const, response: unauthorizedResponse("Missing access token.") };
  }

  await setAuthToken(supabase, bearerToken);
  const {
    data: { user: tokenUser },
  } = await supabase.auth.getUser();

  if (!tokenUser) {
    return { ok: false as const, response: unauthorizedResponse("Invalid or expired token.") };
  }

  return { ok: true as const, userId: tokenUser.id };
};
