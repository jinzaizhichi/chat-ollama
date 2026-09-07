---
title: 用 RuntimeEvent 做 ChatOllama 终端客户端
date: 2026-09-07
---

我最近在为 `ChatOllama` 增加新的 Agent Runtime。Runtime 已经能够调用模型并把流式文本转换成自己的事件，下一步就是让用户真正从终端发出一条消息，再看到回答逐段出现。这篇文章会记录第一个 CLI 如何使用 `AgentSession`、`RuntimeEvent` 和 Node.js `readline/promises`，也会说明为什么测试里使用 Mock Runtime。期望对大家有所帮助。

## 客户端只认识 Runtime

这个 CLI 放在独立的 `packages/agent-cli` workspace package 里。它的运行依赖只有 `@chatollama/agent-runtime`，不会 import `ai`、`@ai-sdk/*` 或任何 Provider package。

这样的边界直接来自 Runtime 的公共接口：

```ts
interface AgentSession {
  getSnapshot(): SessionSnapshot
  subscribe(listener: RuntimeEventListener): () => void
  prompt(input: string): Promise<void>
  cancel(): void
}
```

入口用 Runtime factory 创建 Session：

```ts
const session = createAgentSession({ model: readModelConfig(process.env) })

await runCli({
  session,
  input: process.stdin,
  output: process.stdout,
  error: process.stderr,
})
```

终端输入只交给 `prompt()`。模型返回的是 OpenAI Responses stream、OpenAI-compatible stream，还是以后新增的其他 Provider 格式，都由 Runtime 和 AI SDK 处理。CLI 不解析 Provider chunk，也不需要知道 AI SDK 的 stream part 类型。

## 事件怎样变成终端输出

CLI 在进入输入循环前调用一次 `subscribe()`。不同事件承担不同的显示职责：

- `run.started` 和 `run.completed` 把 run 状态写到 stderr。
- `model.started` 在 stdout 写出 assistant 与模型名称。
- 每个 `model.delta` 到达时立刻写到 stdout。
- `run.failed` 显示 Runtime 已经清理过的错误消息。
- `run.cancelled` 显示取消状态。

关键代码没有重新拼装模型协议，它只是处理一个 discriminated union：

```ts
session.subscribe(event => {
  switch (event.type) {
    case 'model.delta':
      output.write(event.delta)
      break
    case 'run.failed':
      error.write(`[error] ${event.error.message}\n`)
      break
  }
})
```

`model.completed` 只负责结束当前输出行。回答内容来自此前实时写出的 delta，不会等 `prompt()` resolve 后再统一打印。run 状态放在 stderr，文本放在 stdout，使用管道调用时也能分别处理两类信息。

Runtime 失败时会先发布 `run.failed`，随后让 `prompt()` reject。CLI 记录本次失败是否已经由事件显示，避免再打印一遍相同错误。如果某个 Runtime 实现在发布事件前就 reject，CLI 只显示固定的 `Runtime prompt failed`，不会把未知错误对象直接复制到终端。

## readline 也要考虑管道输入

第一版使用 Node.js 自带的 `readline/promises`，没有引入完整 TUI 框架。交互入口会先显示 `You> `，再从 readline interface 的 async iterator 读取每一行：

```ts
for await (const line of readline) {
  const prompt = line.trim()

  if (prompt === '/exit') {
    output.write('Goodbye.\n')
    return
  }

  await session.prompt(prompt)
  output.write('You> ')
}
```

这里没有反复调用 `question()`。原因是 CLI 还需要支持可以复制执行的管道演示命令：输入的第二行可能在第一轮模型请求完成前就已经到达。async iterator 会按顺序消费这些行，既适合真实终端，也适合自动化 smoke test。

退出命令只有 `/exit`。关闭时会 unsubscribe Runtime listener，并关闭 readline interface。这次没有实现 Ctrl+C 只取消当前请求的完整语义，也没有增加 `/new` 或更多快捷命令。

## 模型配置保持最少

默认配置面向本地 Ollama：

```text
AGENT_PROVIDER=ollama
AGENT_MODEL=qwen3:8b
AGENT_BASE_URL=http://localhost:11434/v1
AGENT_API_KEY=ollama
```

除了 provider，后三项都可以用环境变量覆盖。切换到 OpenAI 时，CLI 继续调用同一个 Runtime factory：

```bash
AGENT_PROVIDER=openai \
AGENT_MODEL='gpt-5-mini' \
OPENAI_API_KEY='replace-me' \
pnpm agent:cli
```

`AGENT_BASE_URL` 也可以覆盖 OpenAI endpoint，`AGENT_API_KEY` 可以代替 `OPENAI_API_KEY`。CLI 不显示完整配置，因此 API key 和 base URL 不会进入启动信息或 RuntimeEvent 输出。

## 用 Mock Runtime 测试边界

这次测试没有启动 Ollama，也没有请求在线模型。测试提供一个实现公共 `AgentSession` 接口的 Mock Runtime，可以精确控制输入 Promise 和事件发布时间。

流式测试在发出第一段 `model.delta` 后故意暂停 `prompt()`。断言先检查终端已经出现 `Hello`，再发布第二段文本和 `run.completed`。如果实现把输出延迟到 Promise 完成，这个测试会直接失败。

另一组测试覆盖三条边界：`/exit` 不会被提交给 Runtime；`run.failed` 只显示一次错误；`run.cancelled` 会显示状态并回到下一次输入。环境变量测试则直接断言交给 Runtime factory 的 `ModelConfig`，不会测试 Provider 内部实现。

进程级演示同样使用 Mock Runtime：

```bash
printf 'Hello\n/exit\n' | pnpm agent:cli:demo
```

stdout 会出现实时回答：

```text
ChatOllama Agent CLI
Type /exit to quit.

You> Assistant (openai-compatible/mock-model)> Hello from the mock Runtime.
You> Goodbye.
```

stderr 单独显示 run 状态：

```text
[run demo-run-1] started
[run demo-run-1] completed
```

这个命令不访问网络，也不需要凭据。实际连接 Ollama 时，先拉取默认模型，再启动 CLI：

```bash
ollama pull qwen3:8b
pnpm agent:cli
```

当前增量只负责终端输入、Runtime prompt 和事件输出。连续 Session 的产品语义、`/new`、完整 Ctrl+C 取消、Tools、Skills、compaction、完整 TUI 与 Web 接入都留给后续 Issue；CLI 不为这些功能预留空接口。下一次扩展客户端时，仍然应该先从 Runtime 的公共事件开始，而不是绕过这层边界读取 Provider stream。
