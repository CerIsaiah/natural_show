const BASE_URL = process.env.NATURAL_API_URL || "https://api.natural.co";

function getKey() {
  const key = process.env.NATURAL_API_KEY;
  if (!key) {
    throw new Error(
      "NATURAL_API_KEY not set. Run: /secrets set NATURAL_API_KEY sk_ntl_..."
    );
  }
  return key;
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${getKey()}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function api(method, path, body, extraHeaders = {}) {
  const opts = { method, headers: headers(extraHeaders) };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg =
      err.errors?.[0]?.detail || err.error?.message || err.message || `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

module.exports = {
  natural_pay: async ({
    recipient,
    amount,
    memo,
    customer_party_id,
    idempotency_key,
  }) => {
    const idempKey =
      idempotency_key ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const result = await api(
      "POST",
      "/payments",
      {
        data: {
          attributes: {
            amount: String(Math.round(amount * 100)),
            currency: "USD",
            counterparty: recipient,
            customer_party_id,
            description: memo || "Payment",
          },
        },
      },
      { "Idempotency-Key": idempKey }
    );

    const p = result.data;
    return {
      payment_id: p.id,
      status: p.attributes.status,
      amount: parseInt(p.attributes.amount, 10) / 100,
      recipient,
      claim_url: p.attributes.claim_link || null,
      created_at: p.attributes.created_at,
    };
  },

  natural_balance: async ({ customer_party_id }) => {
    const agentId = process.env.NATURAL_AGENT_ID || "";
    const hdrs = agentId ? { "X-Agent-ID": agentId } : {};
    const result = await api(
      "GET",
      `/wallet/balance?party_id=${customer_party_id}`,
      null,
      hdrs
    );

    const bal = result.data.attributes.balances?.[0];
    return {
      party_id: customer_party_id,
      available: bal?.available?.amount_dollars || "0.00",
      operating: bal?.breakdown?.operating_funded?.amount_dollars || "0.00",
      holds: bal?.breakdown?.holds_outbound?.amount_dollars || "0.00",
      currency: bal?.asset_code || "USD",
    };
  },

  natural_customers: async () => {
    const result = await api("GET", "/customers");
    return result.data.map((c) => ({
      party_id: c.id,
      name: c.attributes.display_name || c.attributes.legal_name,
      status: c.attributes.delegation_status,
      permissions: c.attributes.permissions,
    }));
  },

  natural_transactions: async ({ customer_party_id, limit = 10 }) => {
    const result = await api(
      "GET",
      `/transactions?party_id=${customer_party_id}&limit=${limit}`
    );
    return result.data.map((t) => ({
      id: t.id,
      amount: parseInt(t.attributes.amount, 10) / 100,
      currency: t.attributes.currency,
      status: t.attributes.status,
      direction: t.attributes.direction,
      created_at: t.attributes.created_at,
    }));
  },

  natural_payment_status: async ({ payment_id }) => {
    const result = await api("GET", `/payments/${payment_id}`);
    const p = result.data;
    return {
      id: p.id,
      status: p.attributes.status,
      amount: parseInt(p.attributes.amount, 10) / 100,
      currency: p.attributes.currency,
      claim_link: p.attributes.claim_link || null,
      created_at: p.attributes.created_at,
    };
  },
};
