# Measuring Token Savings

The skill provides efficiency instructions. It does not collect telemetry, install hooks, read account billing, or automatically display savings. No benchmark results have been recorded for this release.

Measured savings require usage records from comparable tasks completed with and without the skill. One run can show consumption; it cannot reveal what the same task would have consumed without the skill.

## What Can Be Reported

| Available evidence | Honest report |
| --- | --- |
| Comparable runs with complete usage records | Observed token difference and percentage, with task quality and measurement scope. |
| Usage for the skill-enabled run only | Tokens consumed; savings not measured because the baseline is missing. |
| Transcripts but no usage counters | Tool calls, repeated reads, correction turns, and optionally estimated visible-text tokens. These do not establish total token savings. |
| No records | Savings not measured. |

Fewer tools, shorter replies, and less repeated work are useful indicators. They are not proof of savings: a shorter answer can require more internal processing, and skipped verification can cause expensive corrections.

## Collect Usage

Use the host's counters or exported usage records, not the assistant's guess:

| Environment | Starting point |
| --- | --- |
| Claude Code | `/usage` shows session token statistics in current releases. Availability and displayed billing information depend on the client and account. [Documentation](https://code.claude.com/docs/en/costs) |
| Gemini CLI | `/stats model` shows model token counts; `/stats tools` shows tool statistics. [Documentation](https://geminicli.com/docs/reference/commands/#stats) |
| Other agents, IDEs, or API workflows | Use documented session exports, request usage records, or a usage dashboard that isolates the task. Check which token categories and subagent calls it includes. |

If only credits, request counts, a context-window percentage, or monthly totals are available, do not relabel them as task token usage. A tokenizer applied to a transcript can estimate visible text only; it misses hidden instructions, internal tokens, and omitted tool exchanges.

Retain raw records locally with the agent version, model, settings, skill version/mode, task identifier, and measurement start/end. Share aggregates or redacted records when publishing results.

## Compare Equivalent Runs

1. Choose representative tasks and define pass criteria before testing: correct answer, required format, successful tests, or a complete usable artifact.
2. Create equivalent starting states in separate sessions. Keep the model, settings, files/data, tools, permissions, and other skills the same. Disable or remove `token-efficiency` in the baseline environment so automatic discovery cannot activate it.
3. Complete each task without the skill, then in the other environment explicitly activate it and complete the same task. Prevent one run from inheriting the other's answer, edits, or working summary. Use fixtures or isolated copies for workflows with side effects.
4. Record all usage through completion, including clarification and correction turns. Include skill-loading overhead, tool-result input, subagent usage, and verification. Capture any separately charged model calls made by tools within the chosen scope.
5. Repeat paired runs across the task types you care about and alternate their order. Record cache conditions and failures. One pair is an observation, not a general savings claim.
6. Compare quality alongside usage. A cheaper incomplete or incorrect result is a failure, not a successful optimization. Report regressions and failure counts rather than silently excluding them.

Use the same accounting definition for both runs. Sum per-request totals, or take the difference between cumulative session counters, but do not sum cumulative snapshots. Follow the provider's field definitions: cached input and reasoning tokens may already be included in broader totals. Do not double-count them or add tool text separately when it is already counted as model input.

## Calculate and Present Results

For a comparable pair with a positive baseline:

```text
tokens_saved = baseline_total_tokens - skill_total_tokens
savings_percent = 100 * tokens_saved / baseline_total_tokens
```

Negative savings mean usage increased. A zero baseline makes the percentage undefined. For multiple comparable pairs, calculate the aggregate percentage from summed totals rather than averaging percentages from differently sized tasks. Also show the task count, per-task variation, and success rate in each condition.

Illustration only, not a benchmark for this skill:

| Metric | Without skill | With skill |
| --- | --- | --- |
| Total tokens | 10,000 | 8,000 |
| Task passed | Yes | Yes |

Observed difference in this example: 2,000 fewer tokens, or 20%. A real report must identify the usage source, model/settings, skill version/mode, task sample, and any omitted usage. Tool-call and correction-turn counts help explain an observed difference, but do not prove which instruction caused it.

Token reduction and monetary savings are separate metrics. Cached input, output, model selection, and tool charges can have different prices; subscription credits are not interchangeable with tokens. Report money saved only from comparable billing records or an explicitly labeled cost calculation.

## Request an Optional Report

After collecting records, ask the agent:

```text
Compare these baseline and token-efficiency runs using MEASUREMENT.md.
Report the usage source, total tokens, observed difference and percentage,
task success, tool calls, and correction turns. Label missing values
"not measured" and distinguish observed counts from estimates.
Do not infer a baseline or invent savings.

[Attach or reference the usage records and task results.]
```

Keep reporting optional so ordinary tasks do not pay for extra explanations. An automatic report would require host-specific usage integration and a stored comparable baseline; `SKILL.md` alone cannot supply either. Without those inputs, the appropriate user-facing status is `Token savings: not measured`, alongside any available observed workflow counts.
