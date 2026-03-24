class PaymentLedger {
  constructor() {
    this.payments = [];
    this.customers = new Map();
    this.auditLog = [];
    this.idempotencyCache = new Map();

    this._seedDemoData();
  }

  _seedDemoData() {
    this.customers.set("pty_bruce_prop_mgmt", {
      partyId: "pty_bruce_prop_mgmt",
      name: "Bruce Property Management",
      type: "BUSINESS",
      status: "ACTIVE",
      delegationStatus: "ACTIVE",
      permissions: ["payments:read", "payments:write", "wallets:read"],
      limits: { perTransaction: 500000, daily: 2000000, weekly: 5000000 },
      balance: {
        funded: 1250000,
        holds: 0,
        available: 1250000,
      },
    });

    this.customers.set("pty_alice_dev_co", {
      partyId: "pty_alice_dev_co",
      name: "Alice Dev Co",
      type: "BUSINESS",
      status: "ACTIVE",
      delegationStatus: "ACTIVE",
      permissions: ["payments:read", "payments:write", "wallets:read"],
      limits: { perTransaction: 100000, daily: 500000, weekly: 1500000 },
      balance: {
        funded: 340000,
        holds: 15000,
        available: 325000,
      },
    });

    this._addExistingTransactions();
  }

  _addExistingTransactions() {
    const history = [
      { recipientEmail: "terri@plumbingworks.com", recipientName: "Terri (PlumbingWorks)", amount: 35000, memo: "Kitchen faucet repair — Unit 8A", customerId: "pty_bruce_prop_mgmt", status: "COMPLETED", daysAgo: 12 },
      { recipientEmail: "maria@cleanpro.com", recipientName: "Maria (CleanPro)", amount: 15000, memo: "Deep cleaning — Unit 3C", customerId: "pty_bruce_prop_mgmt", status: "COMPLETED", daysAgo: 8 },
      { recipientEmail: "jake@electricworks.net", recipientName: "Jake (ElectricWorks)", amount: 72000, memo: "Panel upgrade — Building B", customerId: "pty_bruce_prop_mgmt", status: "COMPLETED", daysAgo: 5 },
      { recipientEmail: "terri@plumbingworks.com", recipientName: "Terri (PlumbingWorks)", amount: 28000, memo: "Water heater inspection", customerId: "pty_bruce_prop_mgmt", status: "COMPLETED", daysAgo: 2 },
    ];

    for (const h of history) {
      const ts = new Date(Date.now() - h.daysAgo * 86400000);
      this.payments.push({
        id: `pay_${Math.random().toString(36).slice(2, 10)}`,
        amount: h.amount,
        currency: "USD",
        recipient: h.recipientEmail,
        recipientName: h.recipientName,
        memo: h.memo,
        customerPartyId: h.customerId,
        status: h.status,
        claimLink: null,
        createdAt: ts.toISOString(),
        completedAt: ts.toISOString(),
      });
    }
  }

  _log(action, details) {
    const entry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      ...details,
    };
    this.auditLog.push(entry);
    return entry;
  }

  _toDollars(cents) {
    return (cents / 100).toFixed(2);
  }

  _dailySpend(customerId) {
    const today = new Date().toDateString();
    return this.payments
      .filter(
        (p) =>
          p.customerPartyId === customerId &&
          new Date(p.createdAt).toDateString() === today &&
          p.status !== "FAILED"
      )
      .reduce((sum, p) => sum + p.amount, 0);
  }

  listCustomers() {
    const result = Array.from(this.customers.values()).map((c) => ({
      party_id: c.partyId,
      name: c.name,
      type: c.type,
      delegation_status: c.delegationStatus,
      permissions: c.permissions,
      limits: {
        per_transaction: `$${this._toDollars(c.limits.perTransaction)}`,
        daily: `$${this._toDollars(c.limits.daily)}`,
      },
    }));
    this._log("LIST_CUSTOMERS", { count: result.length });
    return result;
  }

  checkBalance(customerPartyId) {
    const customer = this.customers.get(customerPartyId);
    if (!customer) {
      this._log("BALANCE_CHECK_FAILED", { customerPartyId, reason: "CUSTOMER_NOT_FOUND" });
      return { error: "Customer not found", code: "CUSTOMER_NOT_FOUND" };
    }
    if (!customer.permissions.includes("wallets:read")) {
      this._log("BALANCE_CHECK_DENIED", { customerPartyId, reason: "PERMISSION_DENIED" });
      return { error: "Agent lacks wallets:read permission", code: "PERMISSION_DENIED" };
    }

    const dailySpent = this._dailySpend(customerPartyId);
    const result = {
      customer: customer.name,
      party_id: customer.partyId,
      balance: {
        available: `$${this._toDollars(customer.balance.available)}`,
        funded: `$${this._toDollars(customer.balance.funded)}`,
        holds: `$${this._toDollars(customer.balance.holds)}`,
      },
      daily_spend: `$${this._toDollars(dailySpent)}`,
      daily_limit: `$${this._toDollars(customer.limits.daily)}`,
      daily_remaining: `$${this._toDollars(customer.limits.daily - dailySpent)}`,
    };
    this._log("BALANCE_CHECKED", { customerPartyId, available: customer.balance.available });
    return result;
  }

  sendPayment({ recipient, amountDollars, memo, customerPartyId, idempotencyKey }) {
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      const existing = this.idempotencyCache.get(idempotencyKey);
      this._log("IDEMPOTENT_HIT", { idempotencyKey, paymentId: existing.id });
      return { payment: existing, idempotent: true };
    }

    const customer = this.customers.get(customerPartyId);
    if (!customer) {
      return { error: "Customer not found", code: "CUSTOMER_NOT_FOUND" };
    }
    if (!customer.permissions.includes("payments:write")) {
      this._log("PAYMENT_DENIED", { customerPartyId, reason: "PERMISSION_DENIED" });
      return { error: "Agent lacks payments:write permission", code: "PERMISSION_DENIED" };
    }

    const amountCents = Math.round(amountDollars * 100);

    if (amountCents > customer.limits.perTransaction) {
      this._log("PAYMENT_BLOCKED", { customerPartyId, amount: amountCents, reason: "EXCEEDS_PER_TXN_LIMIT", limit: customer.limits.perTransaction });
      return {
        error: `Amount $${amountDollars} exceeds per-transaction limit of $${this._toDollars(customer.limits.perTransaction)}`,
        code: "EXCEEDS_PER_TXN_LIMIT",
        limit: `$${this._toDollars(customer.limits.perTransaction)}`,
      };
    }

    const dailySpent = this._dailySpend(customerPartyId);
    if (dailySpent + amountCents > customer.limits.daily) {
      this._log("PAYMENT_BLOCKED", { customerPartyId, amount: amountCents, reason: "EXCEEDS_DAILY_LIMIT", dailySpent, limit: customer.limits.daily });
      return {
        error: `Payment would exceed daily limit. Spent today: $${this._toDollars(dailySpent)}, limit: $${this._toDollars(customer.limits.daily)}`,
        code: "EXCEEDS_DAILY_LIMIT",
        daily_spent: `$${this._toDollars(dailySpent)}`,
        daily_limit: `$${this._toDollars(customer.limits.daily)}`,
      };
    }

    if (amountCents > customer.balance.available) {
      this._log("PAYMENT_BLOCKED", { customerPartyId, amount: amountCents, reason: "INSUFFICIENT_FUNDS", available: customer.balance.available });
      return {
        error: `Insufficient funds. Available: $${this._toDollars(customer.balance.available)}`,
        code: "INSUFFICIENT_FUNDS",
        available: `$${this._toDollars(customer.balance.available)}`,
      };
    }

    const recentDuplicates = this.payments.filter(
      (p) =>
        p.recipient === recipient &&
        p.amount === amountCents &&
        p.customerPartyId === customerPartyId &&
        Date.now() - new Date(p.createdAt).getTime() < 3600000
    );

    let warning = null;
    if (recentDuplicates.length > 0) {
      warning = `Possible duplicate: ${recentDuplicates.length} similar payment(s) to ${recipient} in the last hour.`;
      this._log("DUPLICATE_WARNING", { recipient, amount: amountCents, similarPayments: recentDuplicates.length });
    }

    customer.balance.available -= amountCents;
    customer.balance.holds += amountCents;

    const isOnPlatform = recipient.includes("plumbing") || recipient.includes("cleanpro");
    const status = isOnPlatform ? "PENDING" : "PENDING_CLAIM";
    const claimLink = status === "PENDING_CLAIM" ? `https://natural.co/claim/${Math.random().toString(36).slice(2, 8)}` : null;

    const payment = {
      id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      amount: amountCents,
      currency: "USD",
      recipient,
      memo,
      customerPartyId,
      status,
      claimLink,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    this.payments.push(payment);

    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, payment);
    }

    this._log("PAYMENT_CREATED", {
      paymentId: payment.id,
      amount: amountCents,
      recipient,
      customerPartyId,
      status,
    });

    return {
      payment: {
        id: payment.id,
        amount: `$${amountDollars.toFixed(2)}`,
        recipient,
        memo,
        status: payment.status,
        claim_link: claimLink,
        created_at: payment.createdAt,
      },
      warning,
    };
  }

  getPayment(paymentId) {
    const p = this.payments.find((x) => x.id === paymentId);
    if (!p) return { error: "Payment not found", code: "NOT_FOUND" };
    this._log("PAYMENT_RETRIEVED", { paymentId });
    return {
      id: p.id,
      amount: `$${this._toDollars(p.amount)}`,
      recipient: p.recipient,
      memo: p.memo,
      status: p.status,
      claim_link: p.claimLink,
      created_at: p.createdAt,
    };
  }

  listTransactions(customerPartyId, limit = 10) {
    const txns = this.payments
      .filter((p) => p.customerPartyId === customerPartyId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        amount: `$${this._toDollars(p.amount)}`,
        recipient: p.recipientName || p.recipient,
        memo: p.memo,
        status: p.status,
        date: new Date(p.createdAt).toLocaleDateString(),
      }));

    this._log("TRANSACTIONS_LISTED", { customerPartyId, count: txns.length });
    return txns;
  }

  getAuditLog(limit = 20) {
    return this.auditLog.slice(-limit);
  }

  getStats() {
    const total = this.payments.length;
    const totalVolume = this.payments.reduce((s, p) => s + p.amount, 0);
    const pending = this.payments.filter((p) => p.status.startsWith("PENDING")).length;
    return {
      total_payments: total,
      total_volume: `$${this._toDollars(totalVolume)}`,
      pending_payments: pending,
      audit_entries: this.auditLog.length,
      customers: this.customers.size,
    };
  }
}

module.exports = { PaymentLedger };
