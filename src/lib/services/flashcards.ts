import type { SupabaseClient } from '../../db/supabase.client';
import type { FlashcardListQueryDto } from '../../types';

type DeleteFlashcardResult = {
  id: number;
};

/**
 * Deletes a flashcard by id for the currently authenticated user (RLS enforced).
 */
export const deleteFlashcard = async (supabase: SupabaseClient, id: number) =>
  supabase.from('flashcards').delete().eq('id', id).select('id').single<DeleteFlashcardResult>();

type ListFlashcardsParams = Required<Pick<FlashcardListQueryDto, 'page' | 'limit' | 'sort' | 'order'>> &
  Pick<FlashcardListQueryDto, 'source' | 'generation_id'>;

/**
 * Lists flashcards for the current user with pagination and optional filters.
 */
export const listFlashcards = async (supabase: SupabaseClient, params: ListFlashcardsParams) => {
  const { page, limit, source, generation_id, sort, order } = params;
  const from = (page - 1) * limit;
  const to = page * limit - 1;

  let query = supabase.from('flashcards').select('*', { count: 'exact' });

  if (source) {
    query = query.eq('source', source);
  }

  if (generation_id) {
    query = query.eq('generation_id', generation_id);
  }

  query = query.order(sort, { ascending: order === 'asc' }).range(from, to);

  return query;
};
