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
