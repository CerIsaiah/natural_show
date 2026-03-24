const express = require("express");
const http = require("http");
const path = require("path");
const { PaymentLedger } = require("./src/ledger");

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const ledger = new PaymentLedger();

const TOOLS = {
  natural_customers: {
    description: "List customers who delegated payment authority",
    handler: () => ledger.listCustomers(),
  },
  natural_balance: {
    description: "Check wallet balance",
    handler: ({ customer_party_id }) => ledger.checkBalance(customer_party_id),
  },
  natural_pay: {
    description: "Send a payment",
    handler: ({ recipient, amount, memo, customer_party_id }) =>
      ledger.sendPayment({
        recipient,
        amountDollars: amount,
        memo,
        customerPartyId: customer_party_id,
        idempotencyKey: `idem_${Date.now()}`,
      }),
  },
  natural_payment_status: {
    description: "Get payment status",
    handler: ({ payment_id }) => ledger.getPayment(payment_id),
  },
  natural_transactions: {
    description: "List recent transactions",
    handler: ({ customer_party_id, limit }) =>
      ledger.listTransactions(customer_party_id, limit || 10),
  },
};

const KNOWN_RECIPIENTS = {
  terri: "terri@plumbingworks.com",
  plumber: "terri@plumbingworks.com",
  plumbing: "terri@plumbingworks.com",
  plumbingworks: "terri@plumbingworks.com",
  maria: "maria@cleanpro.com",
  cleaning: "maria@cleanpro.com",
  cleanpro: "maria@cleanpro.com",
  cleaner: "maria@cleanpro.com",
  jake: "jake@electricworks.net",
  electrician: "jake@electricworks.net",
  electric: "jake@electricworks.net",
  electricworks: "jake@electricworks.net",
};

function extractAmount(msg) {
  const patterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    /(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars|usd|bucks)/i,
    /(?:pay|send|transfer|give|wire)[\s\S]{0,30}?(\d[\d,]*(?:\.\d{1,2})?)/i,
    /(\d[\d,]*(?:\.\d{1,2})?)/,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 100000000) return val;
    }
  }
  return null;
}

function extractRecipient(msg) {
  const emailMatch = msg.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) return emailMatch[0];

  const cleaned = msg.toLowerCase().replace(/[^a-z0-9\s@]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (KNOWN_RECIPIENTS[word]) return KNOWN_RECIPIENTS[word];
  }

  const nameMatch = msg.replace(/[^a-zA-Z0-9\s]/g, " ").match(/(?:pay|send|to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) {
    const name = nameMatch[1].toLowerCase();
    if (KNOWN_RECIPIENTS[name]) return KNOWN_RECIPIENTS[name];
    return `${name.replace(/\s+/g, ".")}@example.com`;
  }

  const anyNameMatch = msg.replace(/[^a-zA-Z0-9\s]/g, " ").match(/(?:pay|send|to)\s+(\w+)/i);
  if (anyNameMatch) {
    const name = anyNameMatch[1].toLowerCase();
    if (["me", "my", "the", "a", "an", "for", "it", "them", "some", "this", "that"].includes(name)) return null;
    if (/^\d+$/.test(name)) return null;
    if (KNOWN_RECIPIENTS[name]) return KNOWN_RECIPIENTS[name];
    return `${name}@example.com`;
  }

  return null;
}

function extractMemo(msg) {
  const patterns = [
    /(?:for|re|memo|description|regarding)\s*[:\-]?\s*["']?(.+?)["']?\s*$/i,
    /(?:for)\s+(?:the\s+)?(.+?)$/i,
  ];

  const cleaned = msg
    .replace(/\$?\d[\d,.]*/, "")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/, "")
    .trim();

  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m && m[1]) {
      let memo = m[1].trim();
      memo = memo.replace(/^(pay|send|transfer|to)\s+\w+\s*/i, "").trim();
      if (memo.length >= 3 && memo.length <= 100) return memo;
    }
  }

  const afterFor = msg.match(/for\s+(.+)/i);
  if (afterFor) {
    let memo = afterFor[1].replace(/\$?\d[\d,.]*/, "").trim();
    if (memo.length >= 3) return memo.slice(0, 80);
  }

  return "Payment";
}

function isPaymentIntent(msg) {
  return /\b(pay|send|transfer|wire|give|compensate|reimburse|tip)\b/i.test(msg);
}

function isBalanceIntent(msg) {
  return /\b(balance|how much|wallet|funds|money|available|remaining)\b/i.test(msg);
}

function isCustomerIntent(msg) {
  return /\b(customer|client|delegat|who|account|list\s+(?:my|all))\b/i.test(msg);
}

function isTransactionIntent(msg) {
  return /\b(transaction|history|recent|past|previous|show.*pay|last)\b/i.test(msg);
}

function isStatusIntent(msg) {
  return /pay_\w+/.test(msg) || /\b(status|track|where|check.*payment)\b/i.test(msg);
}

function agentDecide(message, conversationHistory) {
  const msg = message;
  const lower = msg.toLowerCase();
  const steps = [];

  const customerIdFromHistory = conversationHistory.find(
    (m) => m.role === "tool_result" && m.data?.party_id
  )?.data?.party_id || "pty_bruce_prop_mgmt";

  if (isCustomerIntent(lower) && !isPaymentIntent(lower)) {
    steps.push({ tool: "natural_customers", args: {} });
    return { steps, reply: null };
  }

  if (isBalanceIntent(lower) && !isPaymentIntent(lower)) {
    steps.push({
      tool: "natural_balance",
      args: { customer_party_id: customerIdFromHistory },
    });
    return { steps, reply: null };
  }

  if (isPaymentIntent(lower)) {
    const amount = extractAmount(msg);
    const recipient = extractRecipient(msg);
    const memo = extractMemo(msg);

    if (!amount && !recipient) {
      return {
        steps: [],
        reply: "I'd like to help with that payment. Could you include:\n• A recipient (name or email)\n• An amount (e.g. $500)\n\nExample: \"Pay terri@plumbingworks.com $500 for bathroom repair\"",
      };
    }

    if (!amount) {
      return {
        steps: [],
        reply: `I can send a payment to ${recipient}, but how much? Example: \"Pay ${recipient} $500\"`,
      };
    }

    if (!recipient) {
      return {
        steps: [],
        reply: `Got $${amount.toFixed(2)} — but who should I send it to? Give me a name or email address.`,
      };
    }

    steps.push({
      tool: "natural_balance",
      args: { customer_party_id: customerIdFromHistory },
    });
    steps.push({
      tool: "natural_pay",
      args: { recipient, amount, memo, customer_party_id: customerIdFromHistory },
    });
    return { steps, reply: null };
  }

  if (isTransactionIntent(lower)) {
    steps.push({
      tool: "natural_transactions",
      args: { customer_party_id: customerIdFromHistory, limit: 10 },
    });
    return { steps, reply: null };
  }

  if (isStatusIntent(lower)) {
    const idMatch = msg.match(/pay_\w+/);
    if (idMatch) {
      steps.push({
        tool: "natural_payment_status",
        args: { payment_id: idMatch[0] },
      });
      return { steps, reply: null };
    }
  }

  return {
    steps: [],
    reply: "I'm a payment agent. Here's what I can do:\n\n• \"Pay Mike $200 for plumbing\" — send a payment\n• \"Check my balance\" — see available funds\n• \"Show recent transactions\" — payment history\n• \"List my customers\" — who delegated authority\n\nJust type naturally — I'll figure out the rest.",
  };
}

function formatToolResult(tool, result) {
  if (result.error) return `⚠️ Error: ${result.error}`;

  switch (tool) {
    case "natural_customers":
      return result
        .map((c) => `• **${c.name}** (${c.party_id})\n  Status: ${c.delegation_status} | Limits: ${c.limits.per_transaction}/txn, ${c.limits.daily}/day`)
        .join("\n");

    case "natural_balance":
      return `**${result.customer}**\nAvailable: ${result.balance.available}\nDaily spend: ${result.daily_spend} of ${result.daily_limit}\nRemaining today: ${result.daily_remaining}`;

    case "natural_pay": {
      const p = result.payment;
      let msg = `✅ Payment sent!\n\nID: \`${p.id}\`\nAmount: ${p.amount}\nTo: ${p.recipient}\nMemo: ${p.memo}\nStatus: ${p.status}`;
      if (p.claim_link) msg += `\n\n📧 Claim link sent to recipient: ${p.claim_link}`;
      if (result.warning) msg += `\n\n⚠️ ${result.warning}`;
      return msg;
    }

    case "natural_transactions":
      if (result.length === 0) return "No transactions found.";
      return result
        .map((t) => `• ${t.date} — ${t.amount} to ${t.recipient}\n  ${t.memo} (${t.status})`)
        .join("\n");

    case "natural_payment_status":
      return `Payment ${result.id}\nAmount: ${result.amount}\nStatus: ${result.status}\nCreated: ${result.created_at}`;

    default:
      return JSON.stringify(result, null, 2);
  }
}

app.post("/api/chat", (req, res) => {
  const { message, history = [] } = req.body;
  const events = [];
  const decision = agentDecide(message, history);

  if (decision.steps.length === 0) {
    return res.json({
      events: [{ type: "agent_reply", text: decision.reply }],
    });
  }

  const toolResults = [];

  for (const step of decision.steps) {
    const handler = TOOLS[step.tool]?.handler;
    if (!handler) continue;

    events.push({
      type: "tool_call",
      tool: step.tool,
      args: step.args,
      description: TOOLS[step.tool].description,
    });

    const result = handler(step.args);
    toolResults.push({ tool: step.tool, result });

    events.push({
      type: "tool_result",
      tool: step.tool,
      data: result,
    });
  }

  const lastTool = toolResults[toolResults.length - 1];
  let reply;

  if (decision.steps.some((s) => s.tool === "natural_pay")) {
    const balanceResult = toolResults.find((r) => r.tool === "natural_balance");
    const payResult = toolResults.find((r) => r.tool === "natural_pay");

    if (payResult?.result?.error) {
      reply = `I couldn't process the payment.\n\n${formatToolResult("natural_pay", payResult.result)}`;
    } else {
      reply = `${balanceResult ? `Balance checked: ${balanceResult.result.balance?.available || "N/A"} available.\n\n` : ""}${formatToolResult("natural_pay", payResult.result)}`;
    }
  } else {
    reply = formatToolResult(lastTool.tool, lastTool.result);
  }

  events.push({ type: "agent_reply", text: reply });

  res.json({ events });
});

app.get("/api/ledger", (_req, res) => {
  res.json({
    stats: ledger.getStats(),
    audit: ledger.getAuditLog(30),
    recentPayments: ledger.payments.slice(-10).reverse().map((p) => ({
      id: p.id,
      amount: `$${(p.amount / 100).toFixed(2)}`,
      recipient: p.recipientName || p.recipient,
      memo: p.memo,
      status: p.status,
      date: p.createdAt,
    })),
  });
});

app.get("/about", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`NaturalClaw running at http://localhost:${PORT}`);
});
