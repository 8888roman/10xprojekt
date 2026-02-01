import type { SupabaseClient } from '../../db/supabase.client';

type DeleteFlashcardResult = {
  id: number;
};

/**
 * Deletes a flashcard by id for the currently authenticated user (RLS enforced).
 */
export const deleteFlashcard = async (supabase: SupabaseClient, id: number) =>
  supabase.from('flashcards').delete().eq('id', id).select('id').single<DeleteFlashcardResult>();
