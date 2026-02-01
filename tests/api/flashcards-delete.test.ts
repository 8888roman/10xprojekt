import { describe, expect, it } from "vitest";

import { DELETE } from "../../src/pages/api/flashcards/[id]";
import { createAuthSupabaseMock, createCookies } from "../utils/supabase-mocks";

type DeleteContext = Parameters<typeof DELETE>[0];

const createSupabaseMock = (overrides: Partial<DeleteContext["locals"]["supabase"]> = {}) => ({
  ...createAuthSupabaseMock(),
  from: () => ({
    delete: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: { id: 1 }, error: null }),
        }),
      }),
    }),
  }),
  ...overrides,
});

const createContext = (overrides: Partial<DeleteContext> = {}): DeleteContext =>
  ({
    request: new Request("http://localhost/api/flashcards/1", {
      headers: { Authorization: "Bearer token" },
    }),
    cookies: createCookies({}),
    params: { id: "1" },
    locals: {
      supabase: createSupabaseMock(),
    },
    clientAddress: "127.0.0.1",
    ...overrides,
  }) as DeleteContext;

describe("DELETE /api/flashcards/[id]", () => {
  it("returns 401 when token missing", async () => {
    const context = createContext({
      request: new Request("http://localhost/api/flashcards/1"),
      locals: {
        supabase: createSupabaseMock({
          auth: {
            getUser: async () => ({ data: { user: null }, error: { message: "Unauthorized" } }),
          },
        }),
      },
    });
    const response = await DELETE(context);

    expect(response.status).toBe(401);
  });

  it("returns 400 when id is invalid", async () => {
    const context = createContext({
      params: { id: "0" },
    });
    const response = await DELETE(context);

    expect(response.status).toBe(400);
  });

  it("returns 404 when flashcard not found", async () => {
    const context = createContext({
      locals: {
        supabase: createSupabaseMock({
          from: () => ({
            delete: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
            }),
          }),
        }),
      },
    });
    const response = await DELETE(context);

    expect(response.status).toBe(404);
  });

  it("returns 204 when flashcard deleted", async () => {
    const context = createContext();
    const response = await DELETE(context);

    expect(response.status).toBe(204);
  });
});
