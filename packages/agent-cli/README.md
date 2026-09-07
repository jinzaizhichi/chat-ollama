# ChatOllama Agent CLI

`@chatollama/agent-cli` is the first terminal client for the ChatOllama Agent
Runtime. It creates an `AgentSession`, sends terminal input through `prompt()`,
and renders public `RuntimeEvent` values as they arrive.

The package uses Node.js `readline/promises`. It does not import Vercel AI SDK,
Provider packages, or Provider stream types.

## Requirements

- Node.js 24 LTS (`>=24`)
- pnpm
- Ollama or an OpenAI credential for the live CLI

## Run the offline demo

From the repository root:

```bash
pnpm install
printf 'Hello\n/exit\n' | pnpm agent:cli:demo
```

The demo injects a mock implementation of the public `AgentSession` interface.
It streams two `model.delta` events, makes no network request, and needs no
credential.

Example output:

```text
ChatOllama Agent CLI
Type /exit to quit.

You> Assistant (openai-compatible/mock-model)> Hello from the mock Runtime.
You> Goodbye.
```

Run state is written to stderr:

```text
[run demo-run-1] started
[run demo-run-1] completed
```

## Run with Ollama

The live CLI defaults to Ollama's OpenAI-compatible endpoint and `qwen3:8b`:

```bash
ollama pull qwen3:8b
pnpm agent:cli
```

Override any model connection value when needed:

```bash
AGENT_PROVIDER=ollama \
AGENT_MODEL='llama3.2' \
AGENT_BASE_URL='http://localhost:11434/v1' \
AGENT_API_KEY='ollama' \
pnpm agent:cli
```

Ollama ignores the placeholder API key, but the OpenAI-compatible client accepts
the connection in the same shape as other compatible endpoints.

## Run with OpenAI

```bash
AGENT_PROVIDER=openai \
AGENT_MODEL='gpt-5-mini' \
OPENAI_API_KEY='replace-me' \
pnpm agent:cli
```

`AGENT_API_KEY` can be used instead of `OPENAI_API_KEY`. `AGENT_BASE_URL` can
override the OpenAI endpoint.

Type `/exit` at the `You>` prompt to close the client normally.

## Terminal event mapping

- `run.started` and `run.completed` write run status to stderr.
- `model.started` writes the assistant and model label.
- Each `model.delta` is written to stdout immediately.
- `run.failed` writes the Runtime's sanitized error to stderr.
- `run.cancelled` writes cancellation status to stderr.

The client does not parse Provider streams. It also does not add history
persistence, `/new`, full Ctrl+C request cancellation, a full TUI, Tools,
Skills, compaction, or Web integration.

## Development checks

```bash
pnpm test:agent
pnpm typecheck:agent
pnpm build
printf 'Hello\n/exit\n' | pnpm agent:cli:demo
```

All CLI tests use a mock Runtime and run offline.
