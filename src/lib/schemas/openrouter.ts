import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1, { message: "Message content is required." }),
  name: z.string().optional(),
});

const modelParamsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    top_p: z.number().min(0).max(1).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    seed: z.number().int().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .strict();

export const openRouterChatSchema = z.object({
  system: z.string().min(1).optional(),
  user: z.string().min(1, { message: "User message is required." }),
  history: z.array(messageSchema).optional(),
  model: z.string().min(1).optional(),
  params: modelParamsSchema.optional(),
  schema: z.record(z.any()).optional(),
});

export type OpenRouterChatInput = z.infer<typeof openRouterChatSchema>;
