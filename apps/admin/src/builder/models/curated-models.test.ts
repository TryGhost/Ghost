import { describe, expect, it } from 'vitest';

import { CURATED_MODELS, findCuratedModel } from './curated-models';

describe('curated models', () => {
  it('contains the verified recent tool-capable models from Pi 0.84.2', () => {
    expect(CURATED_MODELS.map((model) => [model.provider, model.id])).toEqual([
      ['openai', 'gpt-5.6-sol'],
      ['openai', 'gpt-5.6-terra'],
      ['openai', 'gpt-5.6-luna'],
      ['openai-codex', 'gpt-5.6-sol'],
      ['openai-codex', 'gpt-5.6-terra'],
      ['openai-codex', 'gpt-5.6-luna'],
      ['anthropic', 'claude-sonnet-5'],
      ['anthropic', 'claude-opus-5'],
      ['anthropic', 'claude-fable-5'],
    ]);
  });

  it('rejects a model that is not in the curated catalog', () => {
    expect(() => findCuratedModel('openai', 'not-a-model')).toThrow(
      'Unsupported OpenAI model: not-a-model',
    );
    expect(() => findCuratedModel('openai-codex', 'not-a-model')).toThrow(
      'Unsupported Codex model: not-a-model',
    );
  });
});
