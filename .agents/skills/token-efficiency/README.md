# Token Efficiency

A reusable skill for reducing the total tokens needed to complete a task correctly. It helps agents reuse context, target tool calls, avoid repeated work, and give concise answers without losing necessary detail.

It applies to coding, research, writing, data analysis, documents, tool workflows, multi-agent tasks, and general questions. It can also work alongside another skill while preserving that skill's required result.

## Installation

From your target project, with Node.js/npm and Git installed:

```bash
npx skills add rahulppatidar/ai-agent-skills --skill token-efficiency --full-depth
```

Select your agents in the prompts; add `--global` for personal installation. This uses the third-party [Vercel skills CLI](https://github.com/vercel-labs/skills). See the repository's [installation guide](../INSTALLATION.md) for manual paths, Windows, native installers, and verification. Remote installation requires the skill on the default branch.

## Usage

Once the agent has discovered the installed skill, request it by name:

```text
Use the token-efficiency skill to review this function for bugs.
token-efficiency: balanced

[Provide the function or its file path.]
```

You can omit the mode. The skill starts with Balanced and adapts effort to the task's complexity, uncertainty, and risk.

Installation enables discovery, but automatic activation depends on the client and task. For a recurring project preference, see the [optional persistent instruction example](../INSTALLATION.md#optional-persistent-preference). No agent-file edit is required for explicit invocation.

## Post-Installation Setup Prompt

Run this prompt in the agent and project where you want a persistent preference. It authorizes a project instruction edit; installing the skill alone does not make that edit.

```text
Configure this project to use the installed token-efficiency skill for
substantial tasks.

1. Identify the current agent and its supported project instruction file or
   rules mechanism from the environment and current documentation. Use AGENTS.md
   for Codex or CLAUDE.md for Claude Code; verify the mechanism for other agents.
   If the agent cannot be identified reliably, ask me which one I use.
2. Confirm token-efficiency is available to this agent and inspect its SKILL.md.
   If it is missing or inaccessible, report that and stop setup without claiming
   success. Do not install anything or change global settings.
3. Read the applicable project instructions. Add or update one concise
   token-efficiency section in the supported project file, creating that file
   only if necessary. Preserve unrelated content and avoid duplicate rules.
   Keep the instruction consistent with higher-priority requirements:

   For substantial tasks, use the installed token-efficiency skill when available.
   Start with Balanced and adapt effort to complexity and risk unless a mode is
   specified by the user or an applicable skill. Preserve correctness, safety,
   required verification, formatting, and complete deliverables. If unavailable,
   say so briefly and continue with the task.

4. Keep the full skill in its installed folder. Configure only this project and
   the current agent; do not create files for other agents or alter SKILL.md.
5. Verify the resulting file and instruction scope. Report the file changed,
   the installed skill location, and how to confirm loading in a new session.
   Distinguish file verification from activation actually observed in the client.
```

Re-running the prompt should update the same section. It does not enable telemetry or prove token savings. See [Measuring Token Savings](MEASUREMENT.md) for evaluation.

## Modes

| Mode | Suitable tasks | Expected behavior |
| --- | --- | --- |
| `lean` | Simple, low-risk, repetitive work | Minimal sufficient context, tools, and explanation. |
| `balanced` | Everyday tasks; the default | Targeted investigation, proportionate checks, concise explanation. |
| `thorough` | Complex, uncertain, or high-risk work | More relevant context, deeper analysis, and stronger verification. |

To specify a mode, use `token-efficiency: lean`, `token-efficiency: balanced`, or `token-efficiency: thorough`. Another skill can include the same directive for its own workflow.

## What to Expect

The output is the requested answer or artifact, not a token-efficiency report. The agent should avoid redundant searches, repeated file reads, unnecessary explanations, and avoidable clarification turns.

Correctness, safety, explicit requirements, formatting, necessary verification, and completeness take priority in every mode. A complex task may need more tokens to prevent costly mistakes or follow-up work.

This is behavioral guidance, not a hard token limit or a guarantee of savings. Assess savings across comparable completed tasks, including tool exchanges and follow-up turns.

## Token Savings

There is no automatic savings counter and no published benchmark yet. The agent can compare actual usage records from equivalent runs with and without the skill when you provide them. Include the skill's own context overhead and all follow-up turns.

With only one run's usage, it can report tokens consumed, not tokens saved. Without counters, fewer tool calls or correction turns are observable indicators, not measured token savings. See [Measuring Token Savings](MEASUREMENT.md) for collection sources, the comparison procedure, and an optional reporting prompt.

## Files and Maintenance

- [SKILL.md](SKILL.md) is the authoritative agent instruction file and contains the current version, stage, and owner under `metadata`.
- `README.md` is optional human-facing documentation; it is not needed to execute the skill.
- [MEASUREMENT.md](MEASUREMENT.md) explains optional evaluation; it need not be loaded for ordinary tasks.

Keep this guide aligned with changes to usage or behavior. Version and stage maintenance follows the repository's [AGENTS.md](../AGENTS.md).
