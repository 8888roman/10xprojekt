import { describe, expect, it } from 'vitest';

import { GET } from '../../src/pages/api/flashcards/index';
import {
  createAuthSupabaseMock,
  createCookies,
  createRequestWithAuth,
} from '../utils/supabase-mocks';

type ListContext = Parameters<typeof GET>[0];

const createSupabaseMock = (overrides: Partial<ListContext['locals']['supabase']> = {}) => {
  const query = {
    eq: () => query,
    order: () => ({
      range: async () => ({ data: [], count: 0, error: null }),
    }),
  };

  return {
    ...createAuthSupabaseMock(),
    from: () => ({
      select: () => query,
    }),
    ...overrides,
  };
};

const createContext = (overrides: Partial<ListContext> = {}): ListContext =>
  ({
    request: createRequestWithAuth('http://localhost/api/flashcards'),
    cookies: createCookies({}),
    params: {},
    locals: {
      supabase: createSupabaseMock(),
    },
    clientAddress: '127.0.0.1',
    ...overrides,
  }) as ListContext;

describe('GET /api/flashcards', () => {
  it('returns 401 when token missing', async () => {
    const context = createContext({
      request: new Request('http://localhost/api/flashcards'),
    });
    const response = await GET(context);

    expect(response.status).toBe(401);
  });

  it('returns 400 when query params invalid', async () => {
    const context = createContext({
      request: createRequestWithAuth('http://localhost/api/flashcards?page=0'),
    });
    const response = await GET(context);

    expect(response.status).toBe(400);
  });

  it('returns 200 with list response', async () => {
    const context = createContext({
      request: createRequestWithAuth('http://localhost/api/flashcards?page=1&limit=20'),
    });
    const response = await GET(context);
    const body = (await response.json()) as { data: unknown[]; meta: { page: number } };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.page).toBe(1);
  });

  it('returns 400 when source is invalid', async () => {
    const context = createContext({
      request: createRequestWithAuth('http://localhost/api/flashcards?source=invalid'),
    });
    const response = await GET(context);

    expect(response.status).toBe(400);
  });

  it('returns 400 when order is invalid', async () => {
    const context = createContext({
      request: createRequestWithAuth('http://localhost/api/flashcards?order=up'),
    });
    const response = await GET(context);

    expect(response.status).toBe(400);
  });

  it('returns 400 when generation_id is invalid', async () => {
    const context = createContext({
      request: createRequestWithAuth('http://localhost/api/flashcards?generation_id=-3'),
    });
    const response = await GET(context);

    expect(response.status).toBe(400);
  });

  it('returns 200 when filters are valid', async () => {
    const context = createContext({
      request: createRequestWithAuth(
        'http://localhost/api/flashcards?source=manual&generation_id=1&sort=updated_at&order=asc',
      ),
    });
    const response = await GET(context);

    expect(response.status).toBe(200);
  });
});
