# NaturalClaw

**Agentic payment orchestration engine — built to demonstrate engineering depth in the agent payments space.**

This is a working payment orchestration system that implements the core patterns from [Natural](https://natural.co)'s agentic payments platform: delegation enforcement, spending limits, idempotency, audit trails, and agent tool interfaces. It runs as an OpenClaw skill and includes a live interactive demo.

---

## What I built (not configured)

This isn't a wrapper around an existing MCP server. It's a custom-built system:

| Component | What it does |
|-----------|-------------|
| **Payment Ledger** | Double-entry tracking with balance management and state machine (PENDING → PENDING_CLAIM → COMPLETED) |
| **Delegation Engine** | Per-transaction limits, daily limits, permission checks — enforced server-side before any payment |
| **Idempotency Layer** | Every payment gets a unique key. Duplicate requests return the cached result, not a new payment |
| **Duplicate Detector** | Flags payments to the same recipient + amount within 1 hour as potential duplicates |
| **Audit Trail** | Every action logged with timestamps and structured metadata — balance checks, limit violations, payments |
| **Agent Tool Interface** | 5 tools following function-calling patterns that an agent reasons about and calls in sequence |

---

## Try it

```bash
npm install && npm start
```

Open http://localhost:3000 and type real payment commands:

- `Pay Terri $500 for the bathroom repair`
- `Check my balance`
- `Show recent transactions`
- `List my customers`
- `Pay jake@electricworks.net $6000 for the panel upgrade` (will hit per-txn limit)
- `Pay Terri $280 for water heater inspection` (will trigger duplicate detection)

Switch to the **Ledger** tab to see payments in real-time. Switch to **Audit Trail** to see every action logged.

---

## OpenClaw Skill

Install directly from GitHub into any OpenClaw instance:

```
openclaw skills add https://github.com/CerIsaiah/natural_show
```

The `SKILL.md` follows the AgentSkills spec with proper YAML frontmatter and metadata gating:

```markdown
---
name: natural-payments
description: Agentic payment orchestration for Natural
metadata: {"openclaw":{"emoji":"⚡","primaryEnv":"NATURAL_API_KEY",
  "requires":{"env":["NATURAL_API_KEY"],"bins":["node"]},
  "homepage":"https://natural.co"}}
---
```

---

## Architecture

```
User message ("Pay Terri $500")
  → Agent reasoning (parse intent, extract entities)
    → natural_balance (check funds, enforce daily limit)
    → natural_pay (validate per-txn limit, check duplicates, debit ledger, create payment)
      → Audit log (structured entry with all metadata)
        → Response (payment ID, status, claim link)
```

The orchestration engine sits between the agent and Natural's API. In sandbox mode, it uses a local ledger. In production, it would forward to `api.natural.co` with the same validation layer.

---

## Why this matters

Natural's platform handles compliance, routing, ledgering, and settlement. But developers building agents on top of Natural need an **orchestration layer** — something that:

1. Enforces business rules before payments reach the API
2. Catches duplicates and anomalies at the agent level
3. Maintains a local audit trail for the agent's decision-making
4. Provides structured tool interfaces that agents can reason about

This project demonstrates that I understand both the infrastructure (Natural's API patterns) and the application layer (what developers actually need to build on top of it).

---

Repo: [github.com/CerIsaiah/natural_show](https://github.com/CerIsaiah/natural_show)
