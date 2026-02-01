/**
 * Supabase Database types for 10x-cards MVP.
 * Matches schema: public.generations, public.generation_error_logs, public.flashcards.
 * Regenerate with: npx supabase gen types typescript --local > src/db/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      generations: {
        Row: {
          id: number;
          user_id: string;
          model: string;
          generated_count: number;
          accepted_unedited_count: number | null;
          accepted_edited_count: number | null;
          source_text_hash: string;
          source_text_length: number;
          generation_duration: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          model: string;
          generated_count: number;
          accepted_unedited_count?: number | null;
          accepted_edited_count?: number | null;
          source_text_hash: string;
          source_text_length: number;
          generation_duration: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          model?: string;
          generated_count?: number;
          accepted_unedited_count?: number | null;
          accepted_edited_count?: number | null;
          source_text_hash?: string;
          source_text_length?: number;
          generation_duration?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      generation_error_logs: {
        Row: {
          id: number;
          user_id: string;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          error_code: string;
          error_message: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          error_code: string;
          error_message: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          model?: string;
          source_text_hash?: string;
          source_text_length?: number;
          error_code?: string;
          error_message?: string;
          created_at?: string;
        };
      };
      flashcards: {
        Row: {
          id: number;
          front: string;
          back: string;
          source: 'ai-full' | 'ai-edited' | 'manual';
          created_at: string;
          updated_at: string;
          generation_id: number | null;
          user_id: string;
        };
        Insert: {
          id?: number;
          front: string;
          back: string;
          source: 'ai-full' | 'ai-edited' | 'manual';
          created_at?: string;
          updated_at?: string;
          generation_id?: number | null;
          user_id: string;
        };
        Update: {
          id?: number;
          front?: string;
          back?: string;
          source?: 'ai-full' | 'ai-edited' | 'manual';
          created_at?: string;
          updated_at?: string;
          generation_id?: number | null;
          user_id?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
