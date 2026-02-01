import type { APIRoute } from "astro";

import { internalErrorResponse, unauthorizedResponse, validationErrorResponse } from "../../../lib/api-responses";
import { loginSchema } from "../../../lib/schemas/auth";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body.", [{ message: "Unable to parse JSON." }]);
  }

  if (!body || typeof body !== "object") {
    return validationErrorResponse("Request body must be a JSON object.");
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse("Validation failed.", parsed.error.issues);
  }

  const { email, password } = parsed.data;

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return unauthorizedResponse("Nieprawidlowy email lub haslo.");
    }

    return new Response(null, { status: 200 });
  } catch {
    return internalErrorResponse("Unexpected server error.");
  }
};
