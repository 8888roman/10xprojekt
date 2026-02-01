import { z } from "zod";

export const createGenerationSchema = z.object({
  model: z.string().min(1, { message: "Model is required." }),
  generated_count: z.coerce.number().int().min(0),
  accepted_unedited_count: z.coerce.number().int().min(0).nullable().optional(),
  accepted_edited_count: z.coerce.number().int().min(0).nullable().optional(),
  source_text_hash: z.string().min(1, { message: "Source text hash is required." }),
  source_text_length: z.coerce.number().int().min(1),
  generation_duration: z.coerce.number().int().min(0),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
