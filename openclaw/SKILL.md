---
name: natural-payments
description: Give your assistant the ability to send payments, check balances, and track transactions through Natural's agentic payments infrastructure.
metadata: {"openclaw":{"emoji":"⚡","primaryEnv":"NATURAL_API_KEY","requires":{"env":["NATURAL_API_KEY"],"bins":["node"]},"optionalEnv":["NATURAL_AGENT_ID"],"homepage":"https://natural.co"}}
---

# Setup

1. Get a Natural API key at [natural.co/contact](https://natural.co/contact) (request sandbox access)
2. Set the key:

```
/secrets set NATURAL_API_KEY sk_ntl_sandbox_your_key_here
```

3. Optionally set your agent ID (for balance checks):

```
/secrets set NATURAL_AGENT_ID agt_your_agent_id
```

That's it. The skill uses Node 18+ built-in fetch — no extra dependencies.

---

You have access to Natural payment tools. Use them whenever the user asks about payments, balances, transactions, or money transfers.

## Available tools

- `natural_pay` — Send a payment to a recipient (email, phone, or party ID). Always confirm amount and recipient with the user before sending. Always check balance first.
  - Required: `recipient`, `amount` (in USD), `customer_party_id`
  - Optional: `memo`, `idempotency_key`

- `natural_balance` — Check wallet balance for a delegated customer.
  - Required: `customer_party_id`

- `natural_customers` — List all customers who delegated payment authority to this agent.

- `natural_transactions` — List recent payment history.
  - Required: `customer_party_id`
  - Optional: `limit` (default 10)

- `natural_payment_status` — Get the current status of a payment.
  - Required: `payment_id`

## Rules

1. ALWAYS confirm the amount and recipient with the user before calling `natural_pay`.
2. ALWAYS check balance via `natural_balance` before sending a payment.
3. Include a clear memo for every payment.
4. If a payment is blocked (limit exceeded, insufficient funds), tell the user the specific reason and the limit/balance.
5. For recipients not on Natural, tell the user they'll receive a claim link via email.
6. When in doubt, ask for confirmation rather than proceeding.
