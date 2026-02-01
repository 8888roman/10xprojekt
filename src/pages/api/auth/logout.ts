import type { APIRoute } from "astro";

import { internalErrorResponse } from "../../../lib/api-responses";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return internalErrorResponse("Failed to log out.");
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  } catch {
    return internalErrorResponse("Unexpected server error.");
  }
};
