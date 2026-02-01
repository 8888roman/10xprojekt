import type { Tables, TablesInsert, TablesUpdate } from './db/database.types';

/**
 * Shared meta for paginated list responses.
 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

/**
 * Generic list response wrapper used by list endpoints.
 */
export type ListResponseDto<TItem> = {
  data: TItem[];
  meta: PaginationMeta;
};

/**
 * Flashcard source values are enforced by the database CHECK constraint,
 * but the generated DB types expose `source` as string. This narrows it
 * to the allowed literals for DTOs and command models.
 */
export type FlashcardSource = 'ai-full' | 'ai-edited' | 'manual';

type FlashcardRow = Tables<'flashcards'>;
type GenerationRow = Tables<'generations'>;
type GenerationErrorLogRow = Tables<'generation_error_logs'>;

/**
 * DTOs
 */
export type FlashcardDto = Omit<FlashcardRow, 'source'> & {
  source: FlashcardSource;
};

export type GenerationDto = GenerationRow;

export type GenerationErrorLogDto = GenerationErrorLogRow;

export type FlashcardListResponseDto = ListResponseDto<FlashcardDto>;
export type GenerationListResponseDto = ListResponseDto<GenerationDto>;
export type GenerationErrorLogListResponseDto = ListResponseDto<GenerationErrorLogDto>;

export type FlashcardProposalDto = Pick<FlashcardDto, 'front' | 'back'>;

export type GenerateFlashcardsResponseDto = {
  proposals: FlashcardProposalDto[];
};

/**
 * Standard error payload for API responses.
 */
export type ErrorResponseDto = {
  error: string;
  message: string;
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
  details: unknown[];
};

/**
 * Command models (request payloads)
 */
type InsertFlashcard = TablesInsert<'flashcards'>;
type UpdateFlashcard = TablesUpdate<'flashcards'>;
type InsertGeneration = TablesInsert<'generations'>;
type InsertGenerationErrorLog = TablesInsert<'generation_error_logs'>;

/**
 * Create flashcard payload.
 * - user_id and server-managed timestamps are omitted and set by the API.
 * - source is narrowed to FlashcardSource.
 */
export type CreateFlashcardCommand = Omit<
  InsertFlashcard,
  'id' | 'user_id' | 'created_at' | 'updated_at'
> & {
  source: FlashcardSource;
};

/**
 * Update flashcard payload.
 * - user_id and server-managed timestamps are omitted.
 * - source is narrowed to FlashcardSource when provided.
 */
export type UpdateFlashcardCommand = Omit<
  UpdateFlashcard,
  'id' | 'user_id' | 'created_at' | 'updated_at'
> & {
  source?: FlashcardSource;
};

/**
 * Create generation payload.
 * - user_id and server-managed timestamps are omitted and set by the API.
 */
export type CreateGenerationCommand = Omit<
  InsertGeneration,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/**
 * Create generation error log payload (append-only).
 * - user_id and server-managed timestamps are omitted and set by the API.
 */
export type CreateGenerationErrorLogCommand = Omit<
  InsertGenerationErrorLog,
  'id' | 'user_id' | 'created_at'
>;

/**
 * Generate proposals payload.
 */
export type GenerateFlashcardsCommand = {
  text: string;
};

/**
 * Path parameter DTOs.
 */
export type FlashcardIdParamDto = Pick<FlashcardRow, 'id'>;

/**
 * Query parameter DTOs for list endpoints.
 */
export type SortOrder = 'asc' | 'desc';

export type FlashcardListQueryDto = {
  page?: number;
  limit?: number;
  source?: FlashcardSource;
  generation_id?: number;
  sort?: 'created_at' | 'updated_at';
  order?: SortOrder;
};

export type GenerationListQueryDto = {
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'updated_at';
  order?: SortOrder;
};

export type GenerationErrorLogListQueryDto = {
  page?: number;
  limit?: number;
  sort?: 'created_at';
  order?: SortOrder;
};

/**
 * OpenRouter types.
 */
export type OpenRouterRole = 'system' | 'user' | 'assistant' | 'tool';

export type Message = {
  role: OpenRouterRole;
  content: string;
  name?: string;
};

export type ModelParams = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  stop?: string | string[];
};

export type JsonSchema = {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: Array<string | number | boolean | null>;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
};

export type ResponseFormatJsonSchema = {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JsonSchema;
  };
};

export type OpenRouterResponseFormat = ResponseFormatJsonSchema;

export type ChatInput = {
  system?: string;
  user: string;
  history?: Message[];
  model?: string;
  params?: ModelParams;
  response_format?: OpenRouterResponseFormat;
};

export type StructuredChatInput = {
  system?: string;
  user: string;
  history?: Message[];
  model?: string;
  params?: ModelParams;
};

export type OpenRouterPayload = {
  model: string;
  messages: Message[];
  response_format?: OpenRouterResponseFormat;
} & ModelParams;

export type OpenRouterChoice = {
  index: number;
  message: {
    role: OpenRouterRole;
    content: string;
  };
  finish_reason?: string;
};

export type OpenRouterResponse = {
  id: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  request_id?: string;
};

export type ChatResult = {
  content: string;
  model: string;
  finishReason?: string;
  requestId?: string;
  raw: OpenRouterResponse;
};

export type StructuredResult<TData = unknown> = {
  data: TData;
  model: string;
  finishReason?: string;
  requestId?: string;
  raw: OpenRouterResponse;
};

export type HealthStatus = {
  ok: boolean;
  status?: number;
  requestId?: string;
  model?: string;
  message?: string;
};

export type OpenRouterError = {
  code: string;
  message: string;
  status?: number;
  details?: unknown[];
  retryable?: boolean;
};
