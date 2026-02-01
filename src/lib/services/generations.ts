import type { SupabaseClient } from '../../db/supabase.client';
import type { CreateGenerationCommand, GenerationDto } from '../../types';

/**
 * Creates a generation record for the current user (RLS enforced).
 */
export const createGeneration = async (
  supabase: SupabaseClient,
  payload: CreateGenerationCommand,
  userId: string,
) =>
  supabase
    .from('generations')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single<GenerationDto>();
