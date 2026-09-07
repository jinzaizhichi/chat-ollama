import { spawn } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('agent CLI entry point', () => {
  it('reports an unsupported provider without a stack trace', async () => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', '--import', 'tsx', 'src/main.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, AGENT_PROVIDER: 'unsupported' },
        stdio: 'pipe',
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.stdin.end();

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });

    expect(exitCode).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toBe('Unsupported AGENT_PROVIDER: unsupported\n');
  });
});
