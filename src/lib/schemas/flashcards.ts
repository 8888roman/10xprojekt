import { z } from "zod";

export const generateFlashcardsSchema = z.object({
  text: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1000, { message: "Text must be at least 1000 characters." })
        .max(10000, { message: "Text must be at most 10000 characters." })
    ),
});

export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;

export const createFlashcardSchema = z.object({
  front: z.string().min(1, { message: "Front is required." }).max(200),
  back: z.string().min(1, { message: "Back is required." }).max(500),
  source: z.enum(["ai-full", "ai-edited", "manual"]),
  generation_id: z.coerce.number().int().positive({ message: "Generation id must be greater than zero." }).optional(),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

export const flashcardIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int({ message: "Flashcard id must be an integer." })
    .positive({ message: "Flashcard id must be greater than zero." }),
});

export type FlashcardIdParamInput = z.infer<typeof flashcardIdParamSchema>;

export const flashcardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, { message: "Page must be at least 1." }).optional(),
  limit: z.coerce.number().int().min(1, { message: "Limit must be at least 1." }).optional(),
  source: z.enum(["ai-full", "ai-edited", "manual"]).optional(),
  generation_id: z.coerce.number().int().positive({ message: "Generation id must be greater than zero." }).optional(),
  sort: z.enum(["created_at", "updated_at"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export type FlashcardListQueryInput = z.infer<typeof flashcardListQuerySchema>;
