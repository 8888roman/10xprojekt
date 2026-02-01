import { describe, expect, it } from "vitest";

import { POST } from "../../src/pages/api/generations/index";
import { createAuthSupabaseMock, createCookies } from "../utils/supabase-mocks";

type CreateContext = Parameters<typeof POST>[0];

const createSupabaseMock = (overrides: Partial<CreateContext["locals"]["supabase"]> = {}) => ({
  ...createAuthSupabaseMock(),
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 10,
            model: "openai/gpt-4.1-mini",
            generated_count: 3,
            accepted_unedited_count: 2,
            accepted_edited_count: 1,
            source_text_hash: "hash",
            source_text_length: 1200,
            generation_duration: 0,
            user_id: "user-id",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    }),
  }),
  ...overrides,
});

const createContext = (body: unknown, overrides: Partial<CreateContext> = {}): CreateContext =>
  ({
    request: new Request("http://localhost/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
      body: JSON.stringify(body),
    }),
    cookies: createCookies({}),
    params: {},
    locals: {
      supabase: createSupabaseMock(),
    },
    clientAddress: "127.0.0.1",
    ...overrides,
  }) as CreateContext;

describe("POST /api/generations", () => {
  it("returns 401 when token missing", async () => {
    const context = createContext(
      {
        model: "openai/gpt-4.1-mini",
        generated_count: 2,
        accepted_unedited_count: 1,
        accepted_edited_count: 1,
        source_text_hash: "hash",
        source_text_length: 1200,
        generation_duration: 0,
      },
      {
        request: new Request("http://localhost/api/generations", { method: "POST" }),
        locals: {
          supabase: createSupabaseMock({
            auth: {
              getUser: async () => ({ data: { user: null }, error: { message: "Unauthorized" } }),
            },
          }),
        },
      }
    );
    const response = await POST(context);

    expect(response.status).toBe(401);
  });

  it("returns 400 when payload invalid", async () => {
    const context = createContext({ model: "", generated_count: -1 });
    const response = await POST(context);

    expect(response.status).toBe(400);
  });

  it("returns 201 when generation created", async () => {
    const context = createContext({
      model: "openai/gpt-4.1-mini",
      generated_count: 3,
      accepted_unedited_count: 2,
      accepted_edited_count: 1,
      source_text_hash: "hash",
      source_text_length: 1200,
      generation_duration: 0,
    });
    const response = await POST(context);
    const body = (await response.json()) as { id: number };

    expect(response.status).toBe(201);
    expect(body.id).toBe(10);
  });
});
