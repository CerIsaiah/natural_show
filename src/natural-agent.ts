import { NaturalClient } from "@naturalpay/sdk";

const natural = new NaturalClient({
  apiKey: process.env.NATURAL_API_KEY!,
});

const AGENT_ID = process.env.NATURAL_AGENT_ID!;

interface PaymentRequest {
  recipientEmail: string;
  amountDollars: number;
  customerPartyId: string;
  memo: string;
}

export async function listDelegatedCustomers() {
  const customers = await natural.customers.list();
  return customers.data.map((c: any) => ({
    id: c.id,
    name: c.attributes.display_name,
    status: c.attributes.delegation_status,
    permissions: c.attributes.permissions,
  }));
}

export async function checkBalance(customerPartyId: string) {
  const balance = await natural.wallet.balance({
    partyId: customerPartyId,
    agentId: AGENT_ID,
  });

  const usd = balance.data.attributes.balances.find(
    (b: any) => b.asset_code === "USD"
  );

  return {
    available: usd?.available.amount_dollars ?? "0.00",
    holds: usd?.breakdown.holds_outbound.amount_dollars ?? "0.00",
    funded: usd?.breakdown.operating_funded.amount_dollars ?? "0.00",
  };
}

export async function sendPayment(req: PaymentRequest) {
  const amountCents = Math.round(req.amountDollars * 100);

  const payment = await natural.payments.create({
    recipient: req.recipientEmail,
    amount: amountCents,
    memo: req.memo,
    agentId: AGENT_ID,
    customerPartyId: req.customerPartyId,
    idempotencyKey: `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  });

  return {
    paymentId: payment.data.id,
    status: payment.data.attributes.status,
    claimLink: payment.data.attributes.claim_link,
    amount: req.amountDollars,
    recipient: req.recipientEmail,
  };
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await natural.payments.retrieve(paymentId);
  return {
    id: payment.data.id,
    status: payment.data.attributes.status,
    amount: payment.data.attributes.amount,
    createdAt: payment.data.attributes.created_at,
  };
}
