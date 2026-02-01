import { describe, expect, it, vi } from 'vitest';

import { createCookies } from '../utils/supabase-mocks';

vi.mock('../../src/lib/services/openrouter', () => {
  let chatResult: any = {
    content: 'ok',
    model: 'openai/gpt-4.1-mini',
    requestId: 'req_1',
    finishReason: 'stop',
  };
  let structuredResult: any = {
    data: { ok: true },
    model: 'openai/gpt-4.1-mini',
    requestId: 'req_2',
    finishReason: 'stop',
  };
  let nextError: Error | null = null;

  class OpenRouterServiceError extends Error {
    public readonly status?: number;
    public readonly retryable?: boolean;
    public readonly details?: unknown[];

    public constructor(message: string, status?: number, retryable?: boolean, details?: unknown[]) {
      super(message);
      this.name = 'OpenRouterServiceError';
      this.status = status;
      this.retryable = retryable;
      this.details = details;
    }
  }

  class OpenRouterService {
    public async createChatCompletion() {
      if (nextError) {
        throw nextError;
      }
      return chatResult;
    }

    public async createStructuredCompletion() {
      if (nextError) {
        throw nextError;
      }
      return structuredResult;
    }
  }

  const __setMockOpenRouter = (options: {
    chatResult?: unknown;
    structuredResult?: unknown;
    error?: Error | null;
  }) => {
    if (options.chatResult !== undefined) {
      chatResult = options.chatResult;
    }
    if (options.structuredResult !== undefined) {
      structuredResult = options.structuredResult;
    }
    if (options.error !== undefined) {
      nextError = options.error;
    }
  };

  return { OpenRouterService, OpenRouterServiceError, __setMockOpenRouter };
});

import { POST } from '../../src/pages/api/openrouter/chat';
import { __setMockOpenRouter, OpenRouterServiceError } from '../../src/lib/services/openrouter';

type PostContext = Parameters<typeof POST>[0];

const createContext = (body: unknown): PostContext =>
  ({
    request: new Request('http://localhost/api/openrouter/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    cookies: createCookies({}),
    params: {},
    locals: {} as PostContext['locals'],
    clientAddress: '127.0.0.1',
  }) as PostContext;

describe('POST /api/openrouter/chat', () => {
  it('returns chat completion', async () => {
    __setMockOpenRouter({
      chatResult: {
        content: 'Hello',
        model: 'openai/gpt-4.1-mini',
        requestId: 'req_123',
        finishReason: 'stop',
      },
      error: null,
    });

    const response = await POST(createContext({ user: 'Hi' }));
    const body = (await response.json()) as { content: string; model: string; requestId?: string };

    expect(response.status).toBe(200);
    expect(body.content).toBe('Hello');
    expect(body.requestId).toBe('req_123');
  });

  it('returns structured completion', async () => {
    __setMockOpenRouter({
      structuredResult: {
        data: { ok: true },
        model: 'openai/gpt-4.1-mini',
        requestId: 'req_456',
        finishReason: 'stop',
      },
      error: null,
    });

    const response = await POST(
      createContext({
        user: 'Hi',
        schema: {
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
        },
      }),
    );
    const body = (await response.json()) as { data: { ok: boolean } };

    expect(response.status).toBe(200);
    expect(body.data.ok).toBe(true);
  });

  it('returns validation error for invalid payload', async () => {
    const response = await POST(createContext({}));

    expect(response.status).toBe(400);
  });

  it('maps OpenRouterServiceError to 503', async () => {
    __setMockOpenRouter({
      error: new OpenRouterServiceError('Service unavailable', 503, true, [{ code: 'E' }]),
    });

    const response = await POST(createContext({ user: 'Hi' }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).toBe('Service unavailable');
  });
});
