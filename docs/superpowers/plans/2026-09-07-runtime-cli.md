# Runtime Event-driven CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runnable Node.js terminal client that creates an `AgentSession`, submits prompts, and renders public `RuntimeEvent` values without importing AI SDK packages.

**Architecture:** Keep terminal behavior in one `runCli` function driven by Node.js `readline/promises`, with an injected public `AgentSession` so offline tests can exercise the real event-to-terminal mapping. Keep environment parsing in a small configuration module, and let the executable entry point connect that configuration to the Runtime factory.

**Tech Stack:** TypeScript, Node.js 24 ESM, `readline/promises`, pnpm workspace, Vitest

**Spec:** GitHub Issue [#732](https://github.com/sugarforever/chat-ollama/issues/732), under Epic [#730](https://github.com/sugarforever/chat-ollama/issues/730)

## Global Constraints

- The CLI may import only the public `@chatollama/agent-runtime` package surface, Node.js built-ins, and its test runner.
- The CLI must not import `ai`, `@ai-sdk/*`, or Provider packages and must not parse Provider streams.
- This increment excludes continuous history, `/new`, complete Ctrl+C cancellation, a full TUI, Tools, Skills, compaction, and Web integration.
- Every production behavior is introduced by a failing test, then the minimum implementation that makes it pass.
- The launch path uses Node.js `readline/promises` and supports `/exit`.

---

### Task 1: Package configuration and model environment mapping

**Files:**
- Create: `packages/agent-cli/package.json`
- Create: `packages/agent-cli/tsconfig.json`
- Create: `packages/agent-cli/src/config.spec.ts`
- Create: `packages/agent-cli/src/config.ts`
- Modify: `package.json`
- Modify: `Dockerfile`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ModelConfig` from `@chatollama/agent-runtime`.
- Produces: `readModelConfig(env: NodeJS.ProcessEnv): ModelConfig`.

- [x] **Step 1: Add the package/test configuration and write failing configuration tests**

  Cover OpenAI mapping from `AGENT_MODEL`, `AGENT_BASE_URL`, and `OPENAI_API_KEY`, plus Ollama-compatible defaults and `AGENT_API_KEY`.

- [x] **Step 2: Run the focused test and confirm RED**

  Run: `pnpm --filter @chatollama/agent-cli test -- src/config.spec.ts`

  Expected: fail because `readModelConfig` does not exist.

- [x] **Step 3: Implement the minimum environment mapping**

  `AGENT_PROVIDER=openai` produces an OpenAI config. The default or `ollama` value produces an OpenAI-compatible config with `qwen3:8b`, `http://localhost:11434/v1`, and `ollama` defaults, all overridable by the three requested environment variables.

- [x] **Step 4: Re-run the focused test and confirm GREEN**

  Run: `pnpm --filter @chatollama/agent-cli test -- src/config.spec.ts`

- [x] **Step 5: Update workspace scripts, Docker manifest copying, and the lockfile**

  Add root `agent:cli`, `agent:cli:demo`, CLI-inclusive test/typecheck scripts, and copy the new package manifest before Docker's frozen install.

### Task 2: Event-driven readline client

**Files:**
- Create: `packages/agent-cli/src/cli.spec.ts`
- Create: `packages/agent-cli/src/cli.ts`
- Create: `packages/agent-cli/src/main.ts`

**Interfaces:**
- Consumes: public `AgentSession`, `RuntimeEvent`, and `createAgentSession` from `@chatollama/agent-runtime`.
- Produces: `runCli(options: { session: AgentSession; input: NodeJS.ReadableStream; output: NodeJS.WritableStream; error: NodeJS.WritableStream }): Promise<void>` and the executable `main.ts` entry point.

- [x] **Step 1: Write a failing streaming behavior test**

  Drive the client with a fake public Runtime. Submit `Hello`, emit `run.started`, `model.started`, one `model.delta`, pause, and verify the delta is already visible before the prompt Promise resolves. Then emit the remaining delta and `run.completed`.

- [x] **Step 2: Run the focused test and confirm RED**

  Run: `pnpm --filter @chatollama/agent-cli test -- src/cli.spec.ts`

  Expected: fail because `runCli` does not exist.

- [x] **Step 3: Implement the readline loop and Runtime event renderer**

  Use `createInterface` from `node:readline/promises`; send non-empty input to `session.prompt()`, write deltas immediately, show model/run state and stable errors, and always unsubscribe and close readline on exit.

- [x] **Step 4: Re-run the streaming test and confirm GREEN**

  Run: `pnpm --filter @chatollama/agent-cli test -- src/cli.spec.ts`

- [x] **Step 5: Add failing `/exit` and failure-event tests, then implement only what they require**

  `/exit` must resolve without calling `prompt()`. `run.failed` must write `Model request failed` to stderr and allow another input or exit.

- [x] **Step 6: Run all CLI tests and type checking**

  Run: `pnpm --filter @chatollama/agent-cli test && pnpm --filter @chatollama/agent-cli typecheck`

### Task 3: Offline demo and documentation

**Files:**
- Create: `packages/agent-cli/examples/mock-runtime.ts`
- Create: `packages/agent-cli/examples/mock-runtime.spec.ts`
- Create: `packages/agent-cli/README.md`
- Create: `blogs/20260907-runtime-event-driven-cli_zh.md`

**Interfaces:**
- Consumes: `runCli` and the public Runtime `AgentSession`/`RuntimeEvent` types.
- Produces: `pnpm agent:cli:demo`, a copyable online launch command, and the Chinese development article.

- [x] **Step 1: Write a failing process-level offline demo test**

  Spawn the demo with scripted `Hello` and `/exit` input; assert streamed mock text, run status, clean exit, and no credential leakage.

- [x] **Step 2: Run the demo test and confirm RED**

  Run: `pnpm --filter @chatollama/agent-cli test -- examples/mock-runtime.spec.ts`

  Expected: fail because the demo executable does not exist.

- [x] **Step 3: Implement the mock Runtime demo and confirm GREEN**

  The fake publishes only documented Runtime events and never imports AI SDK packages.

- [x] **Step 4: Document exact launch commands and scope boundaries**

  README examples cover the offline demo, Ollama defaults, and OpenAI environment overrides. The Chinese article explains the event boundary, readline loop, TDD test seam, commands, and explicit non-goals in the user's established writing style.

- [x] **Step 5: Run final verification and self-review**

  Run CLI/runtime tests, CLI/runtime type checks, `pnpm build`, the piped offline smoke test, an import/dependency audit, Chinese punctuation checks, `git diff --check origin/main...HEAD`, and a requirement-by-requirement diff review before committing and opening the PR.
