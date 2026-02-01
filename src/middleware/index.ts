import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/reset-password"]);

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  if (PUBLIC_PATHS.has(url.pathname) || url.pathname.startsWith("/api/auth/")) {
    return next();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = { id: user.id, email: user.email ?? "" };
    return next();
  }

  if (url.pathname.startsWith("/api/")) {
    return next();
  }

  return redirect("/login");
});
