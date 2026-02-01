import { describe, expect, it } from 'vitest';

import { GET } from '../../src/pages/api/flashcards/[id]';
import {
  createAuthSupabaseMock,
  createCookies,
  createRequestWithAuth,
} from '../utils/supabase-mocks';

type GetContext = Parameters<typeof GET>[0];

const createSupabaseMock = (overrides: Partial<GetContext['locals']['supabase']> = {}) => ({
  ...createAuthSupabaseMock(),
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: { id: 1, front: 'Front', back: 'Back', source: 'manual' },
          error: null,
        }),
      }),
    }),
  }),
  ...overrides,
});

const createContext = (overrides: Partial<GetContext> = {}): GetContext =>
  ({
    request: createRequestWithAuth('http://localhost/api/flashcards/1'),
    cookies: createCookies({}),
    params: { id: '1' },
    locals: {
      supabase: createSupabaseMock(),
    },
    clientAddress: '127.0.0.1',
    ...overrides,
  }) as GetContext;

describe('GET /api/flashcards/[id]', () => {
  it('returns 401 when token missing', async () => {
    const context = createContext({
      request: new Request('http://localhost/api/flashcards/1'),
    });
    const response = await GET(context);

    expect(response.status).toBe(401);
  });

  it('returns 400 when id is invalid', async () => {
    const context = createContext({
      params: { id: '0' },
    });
    const response = await GET(context);

    expect(response.status).toBe(400);
  });

  it('returns 404 when flashcard not found', async () => {
    const context = createContext({
      locals: {
        supabase: createSupabaseMock({
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        }),
      },
    });
    const response = await GET(context);

    expect(response.status).toBe(404);
  });

  it('returns 200 with flashcard payload', async () => {
    const context = createContext();
    const response = await GET(context);
    const body = (await response.json()) as { id: number; source: string };

    expect(response.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body.source).toBe('manual');
  });
});
