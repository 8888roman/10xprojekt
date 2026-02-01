import { describe, expect, it } from 'vitest';

import { POST } from '../../src/pages/api/flashcards/index';
import {
  createAuthSupabaseMock,
  createCookies,
  createRequestWithAuth,
} from '../utils/supabase-mocks';

type CreateContext = Parameters<typeof POST>[0];

const createSupabaseMock = (overrides: Partial<CreateContext['locals']['supabase']> = {}) => ({
  ...createAuthSupabaseMock(),
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 1,
            front: 'Front',
            back: 'Back',
            source: 'manual',
            generation_id: null,
            user_id: 'user-id',
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
    request: new Request('http://localhost/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify(body),
    }),
    cookies: createCookies({}),
    params: {},
    locals: {
      supabase: createSupabaseMock(),
    },
    clientAddress: '127.0.0.1',
    ...overrides,
  }) as CreateContext;

describe('POST /api/flashcards', () => {
  it('returns 401 when token missing', async () => {
    const context = createContext(
      { front: 'Front', back: 'Back', source: 'manual' },
      { request: new Request('http://localhost/api/flashcards', { method: 'POST' }) },
    );
    const response = await POST(context);

    expect(response.status).toBe(401);
  });

  it('returns 400 when payload invalid', async () => {
    const context = createContext({ front: '', back: '', source: 'manual' });
    const response = await POST(context);

    expect(response.status).toBe(400);
  });

  it('returns 201 when flashcard created', async () => {
    const context = createContext({
      front: 'Front',
      back: 'Back',
      source: 'manual',
    });
    const response = await POST(context);
    const body = (await response.json()) as { id: number };

    expect(response.status).toBe(201);
    expect(body.id).toBe(1);
  });
});
