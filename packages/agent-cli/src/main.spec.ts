import { describe, expect, it } from 'vitest';

import { runNodeCli } from '../test-utils/run-node-cli.js';

describe('agent CLI entry point', () => {
  it('creates a real Runtime session and exits without making a model request', async () => {
    const result = await runNodeCli('src/main.ts', '/exit\n', {
      AGENT_PROVIDER: 'ollama',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      'ChatOllama Agent CLI\nType /exit to quit.\n\nYou> Goodbye.\n',
    );
    expect(result.stderr).toBe('');
  });

  it('reports an unsupported provider without a stack trace', async () => {
    const result = await runNodeCli('src/main.ts', '', {
      AGENT_PROVIDER: 'unsupported',
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Unsupported AGENT_PROVIDER: unsupported\n');
  });
});
