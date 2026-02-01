import type { FlashcardProposalDto } from '../../types';

export class LlmServiceError extends Error {
  status: 502 | 503;
  code: string;

  constructor(message: string, status: 502 | 503, code = 'LLM_ERROR') {
    super(message);
    this.name = 'LlmServiceError';
    this.status = status;
    this.code = code;
  }
}

export const generateFlashcardProposals = async (
  text: string,
): Promise<FlashcardProposalDto[]> => {
  if (!text) {
    throw new LlmServiceError('Empty input for LLM request.', 502, 'LLM_EMPTY_INPUT');
  }

  // Mocked integration. Replace with real LLM call later.
  return [
    {
      front: 'Mock front',
      back: 'Mock back',
    },
  ];
};
