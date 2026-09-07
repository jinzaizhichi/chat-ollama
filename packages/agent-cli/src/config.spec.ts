import { describe, expect, it } from 'vitest';

import { readModelConfig } from './config.js';

describe('CLI model configuration', () => {
  it('defaults to the local Ollama OpenAI-compatible endpoint', () => {
    expect(readModelConfig({})).toEqual({
      provider: 'openai-compatible',
      name: 'ollama',
      model: 'qwen3:8b',
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
    });
  });

  it('maps model, base URL, and API key overrides for Ollama', () => {
    expect(
      readModelConfig({
        AGENT_PROVIDER: 'ollama',
        AGENT_MODEL: 'llama3.2',
        AGENT_BASE_URL: 'http://models.example.test/v1',
        AGENT_API_KEY: 'compatible-secret',
      }),
    ).toEqual({
      provider: 'openai-compatible',
      name: 'ollama',
      model: 'llama3.2',
      baseURL: 'http://models.example.test/v1',
      apiKey: 'compatible-secret',
    });
  });

  it('maps OpenAI model, base URL, and credential variables', () => {
    expect(
      readModelConfig({
        AGENT_PROVIDER: 'openai',
        AGENT_MODEL: 'gpt-test',
        AGENT_BASE_URL: 'https://openai.example.test/v1',
        OPENAI_API_KEY: 'openai-secret',
      }),
    ).toEqual({
      provider: 'openai',
      model: 'gpt-test',
      baseURL: 'https://openai.example.test/v1',
      apiKey: 'openai-secret',
    });
  });

  it('uses the default OpenAI model when no model override is provided', () => {
    expect(readModelConfig({ AGENT_PROVIDER: 'openai' })).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
      baseURL: undefined,
      apiKey: undefined,
    });
  });

  it('rejects unsupported provider names before creating a Session', () => {
    expect(() => readModelConfig({ AGENT_PROVIDER: 'anthropic' })).toThrow(
      'Unsupported AGENT_PROVIDER: anthropic',
    );
  });
});
