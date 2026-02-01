import { describe, expect, it } from 'vitest';

import { OpenRouterService, OpenRouterServiceError } from '../../src/lib/services/openrouter';

const createResponse = (payload: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers,
  });

describe('OpenRouterService', () => {
  it('returns chat content and request id', async () => {
    const fetchImpl: typeof fetch = async () =>
      createResponse(
        {
          id: 'resp_1',
          created: Date.now(),
          model: 'openai/gpt-4.1-mini',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' } }],
        },
        { 'x-openrouter-request-id': 'req_123' },
      );

    const service = new OpenRouterService({
      apiKey: 'test-key',
      defaultModel: 'openai/gpt-4.1-mini',
      fetchImpl,
    });

    const result = await service.createChatCompletion({
      user: 'Hi',
    });

    expect(result.content).toBe('Hello');
    expect(result.requestId).toBe('req_123');
  });

  it('throws when structured response is invalid JSON', async () => {
    const fetchImpl: typeof fetch = async () =>
      createResponse({
        id: 'resp_2',
        created: Date.now(),
        model: 'openai/gpt-4.1-mini',
        choices: [{ index: 0, message: { role: 'assistant', content: 'not-json' } }],
      });

    const service = new OpenRouterService({
      apiKey: 'test-key',
      defaultModel: 'openai/gpt-4.1-mini',
      fetchImpl,
    });

    await expect(
      service.createStructuredCompletion(
        { user: 'Hi' },
        { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      ),
    ).rejects.toBeInstanceOf(OpenRouterServiceError);
  });
});
