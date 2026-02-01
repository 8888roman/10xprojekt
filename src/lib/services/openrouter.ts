import type {
  ChatInput,
  ChatResult,
  HealthStatus,
  JsonSchema,
  Message,
  ModelParams,
  OpenRouterError,
  OpenRouterPayload,
  OpenRouterResponse,
  OpenRouterResponseFormat,
  StructuredChatInput,
  StructuredResult,
} from '@/types';

type OpenRouterServiceOptions = {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  defaultParams?: ModelParams;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  appName?: string;
  appUrl?: string;
  maxRetries?: number;
};

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class OpenRouterServiceError extends Error implements OpenRouterError {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: unknown[];
  public readonly retryable?: boolean;

  public constructor(options: OpenRouterError) {
    super(options.message);
    this.name = 'OpenRouterServiceError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.retryable = options.retryable;
  }
}

export class OpenRouterService {
  public readonly defaultModel: string;
  public readonly defaultParams: ModelParams;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly appName?: string;
  private readonly appUrl?: string;
  private readonly maxRetries: number;

  public constructor(options: OpenRouterServiceOptions) {
    if (!options.apiKey?.trim()) {
      throw new OpenRouterServiceError({
        code: 'MISSING_API_KEY',
        message: 'OPENROUTER_API_KEY is required.',
      });
    }

    if (!options.defaultModel?.trim()) {
      throw new OpenRouterServiceError({
        code: 'MISSING_DEFAULT_MODEL',
        message: 'Default model is required.',
      });
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = this.normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.defaultModel = options.defaultModel.trim();
    this.defaultParams = options.defaultParams ?? {};
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.appName = options.appName;
    this.appUrl = options.appUrl;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  public getDefaultModel(): string {
    return this.defaultModel;
  }

  public async createChatCompletion(input: ChatInput): Promise<ChatResult> {
    if (!input.user?.trim()) {
      throw new OpenRouterServiceError({
        code: 'INVALID_INPUT',
        message: 'User message is required.',
      });
    }

    const body = this.buildRequestBody(input);
    const raw = await this.request<OpenRouterResponse>('/chat/completions', body);
    return this.parseResponse(raw);
  }

  public async createStructuredCompletion<TData = unknown>(
    input: StructuredChatInput,
    schema: JsonSchema,
  ): Promise<StructuredResult<TData>> {
    if (!input.user?.trim()) {
      throw new OpenRouterServiceError({
        code: 'INVALID_INPUT',
        message: 'User message is required.',
      });
    }

    const responseFormat: OpenRouterResponseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'StructuredResponse',
        strict: true,
        schema,
      },
    };

    const body = this.buildRequestBody({
      ...input,
      response_format: responseFormat,
    });

    const raw = await this.request<OpenRouterResponse>('/chat/completions', body);
    return this.parseStructuredResponse<TData>(raw, schema);
  }

  public async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await this.request<unknown>('/models', undefined, 'GET');
      const requestId = this.extractRequestId(response);
      return { ok: true, requestId };
    } catch (error) {
      const mapped = this.mapError(error);
      return {
        ok: false,
        status: mapped.status,
        requestId: this.extractRequestId(error),
        message: mapped.message,
      };
    }
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.appUrl) {
      headers['HTTP-Referer'] = this.appUrl;
    }

    if (this.appName) {
      headers['X-Title'] = this.appName;
    }

    return headers;
  }

  private buildMessages(system: string | undefined, user: string, history?: Message[]): Message[] {
    const messages: Message[] = [];

    if (system?.trim()) {
      messages.push({ role: 'system', content: system.trim() });
    }

    if (history?.length) {
      messages.push(...history);
    }

    messages.push({ role: 'user', content: user.trim() });

    return messages;
  }

  private buildRequestBody(input: ChatInput): OpenRouterPayload {
    const model = input.model?.trim() ?? this.defaultModel;
    if (!model) {
      throw new OpenRouterServiceError({
        code: 'MISSING_MODEL',
        message: 'Model is required for OpenRouter request.',
      });
    }

    const messages = this.buildMessages(input.system, input.user, input.history);
    const mergedParams: ModelParams = { ...this.defaultParams, ...input.params };

    return {
      model,
      messages,
      ...this.stripUndefined(mergedParams),
      response_format: input.response_format,
    };
  }

  private async request<T>(
    path: string,
    body?: unknown,
    method: 'POST' | 'GET' = 'POST',
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: OpenRouterServiceError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: this.buildHeaders(),
          body: method === 'POST' && body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await this.buildHttpError(response);
          if (error.retryable && attempt < this.maxRetries) {
            await this.sleep(this.getRetryDelay(attempt));
            lastError = error;
            continue;
          }
          throw error;
        }

        const data = await this.safeJsonParse(response);
        return this.attachRequestId(data, response) as T;
      } catch (error) {
        clearTimeout(timeoutId);
        const mapped = this.mapError(error);
        if (mapped.retryable && attempt < this.maxRetries) {
          await this.sleep(this.getRetryDelay(attempt));
          lastError = mapped;
          continue;
        }
        this.logError(mapped);
        throw mapped;
      }
    }

    throw (
      lastError ??
      new OpenRouterServiceError({
        code: 'REQUEST_FAILED',
        message: 'OpenRouter request failed after retries.',
        retryable: false,
      })
    );
  }

  private parseResponse(raw: OpenRouterResponse): ChatResult {
    if (!raw.choices?.length) {
      throw new OpenRouterServiceError({
        code: 'EMPTY_RESPONSE',
        message: 'OpenRouter response contained no choices.',
      });
    }

    const first = raw.choices[0];
    if (!first?.message?.content) {
      throw new OpenRouterServiceError({
        code: 'EMPTY_MESSAGE',
        message: 'OpenRouter response contained no message content.',
      });
    }

    return {
      content: first.message.content,
      model: raw.model,
      finishReason: first.finish_reason,
      requestId: raw.request_id,
      raw,
    };
  }

  private parseStructuredResponse<TData>(raw: OpenRouterResponse, schema: JsonSchema): StructuredResult<TData> {
    const parsed = this.parseResponse(raw);
    let data: TData;

    try {
      data = JSON.parse(parsed.content) as TData;
    } catch (error) {
      throw new OpenRouterServiceError({
        code: 'INVALID_JSON',
        message: 'OpenRouter response is not valid JSON.',
        details: [String(error)],
      });
    }

    const errors = this.validateJsonAgainstSchema(data, schema);
    if (errors.length > 0) {
      throw new OpenRouterServiceError({
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'OpenRouter response does not match JSON schema.',
        details: errors,
      });
    }

    return {
      data,
      model: parsed.model,
      finishReason: parsed.finishReason,
      requestId: parsed.requestId,
      raw: parsed.raw,
    };
  }

  private mapError(error: unknown): OpenRouterServiceError {
    if (error instanceof OpenRouterServiceError) {
      return error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return new OpenRouterServiceError({
        code: 'TIMEOUT',
        message: 'OpenRouter request timed out.',
        retryable: true,
      });
    }

    if (error instanceof Error) {
      return new OpenRouterServiceError({
        code: 'REQUEST_ERROR',
        message: error.message,
        retryable: false,
      });
    }

    return new OpenRouterServiceError({
      code: 'UNKNOWN_ERROR',
      message: 'Unknown OpenRouter error.',
      retryable: false,
    });
  }

  private async buildHttpError(response: Response): Promise<OpenRouterServiceError> {
    const status = response.status;
    const requestId =
      response.headers.get('x-request-id') ?? response.headers.get('x-openrouter-request-id') ?? undefined;

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }

    const retryable = RETRY_STATUS_CODES.has(status);
    const message = this.extractErrorMessage(payload) ?? `OpenRouter request failed with status ${status}.`;

    return new OpenRouterServiceError({
      code: 'HTTP_ERROR',
      message,
      status,
      retryable,
      details: payload ? [payload, { requestId }] : [{ requestId }],
    });
  }

  private async safeJsonParse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }

  private extractErrorMessage(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    if ('error' in payload && typeof (payload as { error?: unknown }).error === 'string') {
      return (payload as { error: string }).error;
    }

    if ('message' in payload && typeof (payload as { message?: unknown }).message === 'string') {
      return (payload as { message: string }).message;
    }

    return undefined;
  }

  private attachRequestId(data: unknown, response: Response): unknown {
    const requestId =
      response.headers.get('x-request-id') ?? response.headers.get('x-openrouter-request-id') ?? undefined;

    if (!requestId || !data || typeof data !== 'object') {
      return data;
    }

    return { ...(data as Record<string, unknown>), request_id: requestId };
  }

  private extractRequestId(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    if ('request_id' in payload && typeof (payload as { request_id?: unknown }).request_id === 'string') {
      return (payload as { request_id: string }).request_id;
    }

    return undefined;
  }

  private stripUndefined<TValue extends Record<string, unknown>>(value: TValue): TValue {
    const output = { ...value };
    for (const [key, val] of Object.entries(output)) {
      if (val === undefined) {
        delete output[key];
      }
    }
    return output;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const normalized = baseUrl.trim().replace(/\/+$/, '');
    return normalized.length ? normalized : DEFAULT_BASE_URL;
  }

  private getRetryDelay(attempt: number): number {
    const base = 300;
    return Math.min(2000, base * Math.pow(2, attempt));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateJsonAgainstSchema(value: unknown, schema: JsonSchema, path = '$'): string[] {
    if (schema.anyOf?.length) {
      const results = schema.anyOf.map((child) => this.validateJsonAgainstSchema(value, child, path));
      if (results.some((errors) => errors.length === 0)) {
        return [];
      }
      return results.flat();
    }

    if (schema.oneOf?.length) {
      const results = schema.oneOf.map((child) => this.validateJsonAgainstSchema(value, child, path));
      const validCount = results.filter((errors) => errors.length === 0).length;
      if (validCount === 1) {
        return [];
      }
      return [`${path} should match exactly one schema variant.`];
    }

    if (schema.allOf?.length) {
      return schema.allOf.flatMap((child) => this.validateJsonAgainstSchema(value, child, path));
    }

    if (schema.enum && !schema.enum.includes(value as never)) {
      return [`${path} should be one of ${schema.enum.join(', ')}.`];
    }

    if (!schema.type) {
      return [];
    }

    switch (schema.type) {
      case 'string':
        return typeof value === 'string' ? [] : [`${path} should be a string.`];
      case 'number':
        return typeof value === 'number' ? [] : [`${path} should be a number.`];
      case 'boolean':
        return typeof value === 'boolean' ? [] : [`${path} should be a boolean.`];
      case 'null':
        return value === null ? [] : [`${path} should be null.`];
      case 'array':
        if (!Array.isArray(value)) {
          return [`${path} should be an array.`];
        }
        if (!schema.items) {
          return [];
        }
        return value.flatMap((item, index) =>
          this.validateJsonAgainstSchema(item, schema.items as JsonSchema, `${path}[${index}]`),
        );
      case 'object':
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return [`${path} should be an object.`];
        }

        const errors: string[] = [];
        const required = schema.required ?? [];
        for (const key of required) {
          if (!(key in (value as Record<string, unknown>))) {
            errors.push(`${path}.${key} is required.`);
          }
        }

        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in (value as Record<string, unknown>)) {
              errors.push(
                ...this.validateJsonAgainstSchema(
                  (value as Record<string, unknown>)[key],
                  propSchema,
                  `${path}.${key}`,
                ),
              );
            }
          }
        }

        if (schema.additionalProperties === false && schema.properties) {
          for (const key of Object.keys(value as Record<string, unknown>)) {
            if (!(key in schema.properties)) {
              errors.push(`${path}.${key} is not allowed.`);
            }
          }
        }

        if (
          schema.additionalProperties &&
          typeof schema.additionalProperties === 'object' &&
          !Array.isArray(schema.additionalProperties)
        ) {
          for (const key of Object.keys(value as Record<string, unknown>)) {
            if (!(schema.properties && key in schema.properties)) {
              errors.push(
                ...this.validateJsonAgainstSchema(
                  (value as Record<string, unknown>)[key],
                  schema.additionalProperties as JsonSchema,
                  `${path}.${key}`,
                ),
              );
            }
          }
        }

        return errors;
      default:
        return [];
    }
  }

  private logError(error: OpenRouterServiceError): void {
    console.error('OpenRouter error', {
      code: error.code,
      status: error.status,
      retryable: error.retryable,
      message: error.message,
    });
  }
}
