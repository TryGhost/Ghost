# How to Write an Effective AGENTS.md

This guide provides best practices for writing an `AGENTS.md` file that helps AI coding agents work effectively in your codebase.

> **Note:** We use `AGENTS.md` as the canonical name for agent-agnostic compatibility. A symlink from `CLAUDE.md` to `AGENTS.md` ensures Claude Code and other tools can find it.

## Why AGENTS.md Matters

LLMs are stateless—they have frozen weights and learn nothing between sessions. The only knowledge they have comes from tokens in the current conversation. Your `AGENTS.md` is the primary mechanism to transfer essential project knowledge at the start of every session.

However, agents are instructed that this context "may or may not be relevant" to their task. If your file contains irrelevant content, agents will learn to disregard it uniformly—including the important parts.

## Core Principles

### Less is More

Research indicates frontier LLMs can reliably follow approximately 150-200 instructions. Since agent system prompts already contain ~50 instructions, your `AGENTS.md` budget is limited. Smaller models degrade exponentially with instruction count.

**Target:** Under 300 lines. Many effective files are under 60 lines.

### Universal Applicability

Every line should apply broadly across all tasks the agent might perform. If guidance only applies to specific scenarios, it doesn't belong in `AGENTS.md`.

**Bad:** Database schema details, specific API endpoint documentation
**Good:** Package manager choice, high-level project structure, build commands

### Progressive Disclosure

Store task-specific documentation in separate files (like `agent-docs/testing.md`) with brief pointers in `AGENTS.md`. Use `file:line` references instead of code snippets when pointing to examples.

```markdown
## Testing

See `agent-docs/testing.md` for detailed test patterns.
See `e2e/CLAUDE.md` for E2E test guidance.
```

## Structure: WHAT, WHY, HOW

Cover three areas in your `AGENTS.md`:

### WHAT (Tech Stack & Structure)

- Primary language(s) and frameworks
- Package manager (critical—agents often guess wrong)
- Monorepo structure if applicable
- Key directories and their purposes

### WHY (Project Purpose)

- Brief description of what the project does
- Who uses it and how
- Keep this extremely brief—one or two sentences

### HOW (Workflow)

- Essential commands: build, test, lint
- Only include commands the agent will frequently need
- Don't exhaustively list every possible command

## Anti-Patterns to Avoid

### Don't Use AGENTS.md as a Linter

Never include code style guidelines. "Never send an LLM to do a linter's job."

- Use automated tools (ESLint, Prettier, Biome) for formatting
- Use agent hooks for pre-commit formatting if needed
- Let agents learn patterns from existing code

### Don't Auto-Generate

Avoid using `/init` or auto-generation tools. This file is high-leverage—manual crafting produces better results than automated extraction.

### Don't Stuff Every Command

Listing every possible command degrades results. Include only frequently-needed commands. Agents can discover others through `package.json` or help commands.

### Don't Include Task-Specific Instructions

If it only applies sometimes, move it to a separate doc:

```markdown
# Bad (in AGENTS.md)
When modifying the payment service, always check the Stripe webhook handlers...

# Good (in AGENTS.md)
See `agent-docs/payments.md` for payment service patterns.
```

## Recommended Structure

```markdown
# AGENTS.md

Brief one-line project description.

## Package Manager

**Always use `yarn` (v1).** (Or npm, pnpm—be explicit)

## Project Structure

- `src/` - Application source
- `tests/` - Test files
- See `agent-docs/architecture.md` for detailed architecture

## Common Commands

```bash
yarn build          # Build the project
yarn test           # Run tests
yarn lint           # Run linting
```

## Code Guidelines

- Commit message format (if non-standard)
- Critical architectural decisions agents must follow

## Troubleshooting

```bash
yarn fix            # Reset if things break
```
```

## Using Progressive Documentation

Create an `agent-docs/` directory for detailed guidance:

```
agent-docs/
├── architecture.md       # Detailed system architecture
├── testing.md           # Test patterns and conventions
├── api-patterns.md      # API design patterns
└── troubleshooting.md   # Common issues and fixes
```

In `AGENTS.md`, add:

```markdown
## Documentation

Before starting complex tasks, identify relevant docs in `agent-docs/`:
- `architecture.md` - System design and component relationships
- `testing.md` - Test patterns for unit, integration, E2E
- `api-patterns.md` - API design conventions
```

This keeps your main file concise while providing depth when needed.

## Symlink Setup

For agent-agnostic compatibility:

```bash
# Create AGENTS.md as the primary file
# Then symlink CLAUDE.md to it
ln -s AGENTS.md CLAUDE.md
```

This ensures both Claude Code (which looks for `CLAUDE.md`) and other tools can find your agent instructions.

## Measuring Effectiveness

Signs your `AGENTS.md` is working:
- Agents consistently use the correct package manager
- Agents find the right files without excessive searching
- Agents follow your commit conventions
- Agents don't need repeated corrections for the same issues

Signs it needs improvement:
- Agents ignore your instructions (file too long or too specific)
- Agents frequently ask about things documented in the file
- You find yourself repeating the same corrections across sessions

## Key Takeaways

1. **Be concise** — under 300 lines, ideally under 100
2. **Be universal** — every line should apply to most tasks
3. **Use progressive disclosure** — detailed docs in separate files
4. **Don't duplicate tooling** — let linters handle style
5. **Maintain manually** — resist auto-generation
6. **Symlink for compatibility** — `CLAUDE.md` → `AGENTS.md`
