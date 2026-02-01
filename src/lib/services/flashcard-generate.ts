import type { FlashcardProposalDto, JsonSchema } from "../../types";
import { OpenRouterService, OpenRouterServiceError } from "./openrouter";

export class LlmServiceError extends Error {
  status: 502 | 503;
  code: string;

  constructor(message: string, status: 502 | 503, code = "LLM_ERROR") {
    super(message);
    this.name = "LlmServiceError";
    this.status = status;
    this.code = code;
  }
}

const getTimeoutMs = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: import.meta.env.OPENROUTER_BASE_URL,
  defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL ?? "openai/gpt-4.1-mini",
  timeoutMs: getTimeoutMs(import.meta.env.OPENROUTER_TIMEOUT_MS),
  appName: import.meta.env.OPENROUTER_APP_NAME,
  appUrl: import.meta.env.OPENROUTER_APP_URL,
});

const FLASHCARD_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
        additionalProperties: false,
      },
    },
  },
  required: ["proposals"],
  additionalProperties: false,
};

export const generateFlashcardProposals = async (text: string): Promise<FlashcardProposalDto[]> => {
  if (!text) {
    throw new LlmServiceError("Empty input for LLM request.", 502, "LLM_EMPTY_INPUT");
  }

  const system = [
    "You are an assistant that creates concise flashcards.",
    "Return JSON only, matching the provided schema.",
    "Use Polish language for both questions and answers.",
  ].join(" ");

  const user = ["Na podstawie ponizszego tekstu przygotuj propozycje fiszek (front/back).", "Tekst:", text.trim()].join(
    "\n\n"
  );

  try {
    const result = await openRouterService.createStructuredCompletion<{ proposals: FlashcardProposalDto[] }>(
      {
        system,
        user,
        params: {
          temperature: 0.2,
          max_tokens: 700,
          top_p: 0.9,
        },
      },
      FLASHCARD_SCHEMA
    );

    return result.data.proposals;
  } catch (error) {
    if (error instanceof OpenRouterServiceError) {
      const status = error.retryable ? 503 : 502;
      throw new LlmServiceError(error.message, status, error.code);
    }
    throw new LlmServiceError("Unexpected LLM error.", 502, "LLM_UNKNOWN_ERROR");
  }
};
