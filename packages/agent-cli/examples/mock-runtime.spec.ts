import { spawn } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('agent CLI mock Runtime demo', () => {
  it('streams a response from piped input without network or credential output', async () => {
    const result = await runDemo('Hello\n/exit\n', {
      AGENT_API_KEY: 'demo-secret',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'Assistant (openai-compatible/mock-model)> Hello from the mock Runtime.\n',
    );
    expect(result.stdout).toContain('Goodbye.\n');
    expect(result.stderr).toBe(
      '[run demo-run-1] started\n[run demo-run-1] completed\n',
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain('demo-secret');
  });
});

async function runDemo(
  input: string,
  env: NodeJS.ProcessEnv,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const child = spawn(
    process.execPath,
    ['--no-warnings', '--import', 'tsx', 'examples/mock-runtime.ts'],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
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
  child.stdin.end(input);

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });

  return { exitCode, stdout, stderr };
}
