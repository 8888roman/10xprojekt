import { z } from 'zod';

export const generateFlashcardsSchema = z.object({
  text: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1000, { message: 'Text must be at least 1000 characters.' })
        .max(10000, { message: 'Text must be at most 10000 characters.' }),
    ),
});

export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;

export const flashcardIdParamSchema = z.object({
  id: z
    .coerce
    .number()
    .int({ message: 'Flashcard id must be an integer.' })
    .positive({ message: 'Flashcard id must be greater than zero.' }),
});

export type FlashcardIdParamInput = z.infer<typeof flashcardIdParamSchema>;
