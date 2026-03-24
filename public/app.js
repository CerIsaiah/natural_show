const chatEl = document.getElementById("chatMessages");
const toolEl = document.getElementById("toolCalls");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const history = [];

function scrollBottom(el) {
  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
}

function addMsg(type, text) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  const sender = document.createElement("div");
  sender.className = "sender";
  sender.textContent = type === "user" ? "You" : "Agent";
  div.appendChild(sender);
  const body = document.createElement("div");
  body.innerHTML = text.replace(/\n/g, "<br>").replace(/`([^`]+)`/g, "<code>$1</code>");
  div.appendChild(body);
  chatEl.appendChild(div);
  scrollBottom(chatEl);
}

function addTyping() {
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.id = "typing";
  for (let i = 0; i < 3; i++) div.appendChild(document.createElement("span"));
  chatEl.appendChild(div);
  scrollBottom(chatEl);
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

function addToolEvent(type, tool, data) {
  const empty = toolEl.querySelector(".tool-empty");
  if (empty) empty.remove();

  const div = document.createElement("div");
  div.className = "tool-event";

  const badgeClass = type === "tool_call" ? "call" : data?.error ? "error" : "result";
  const badgeLabel = type === "tool_call" ? "CALL" : data?.error ? "ERROR" : "RESULT";

  div.innerHTML = `
    <div class="tool-event-header">
      <span class="tool-badge ${badgeClass}">${badgeLabel}</span>
      <span class="tool-name">${tool}</span>
    </div>
    <div class="tool-event-body">${JSON.stringify(data, null, 2)}</div>
  `;
  toolEl.appendChild(div);
  scrollBottom(toolEl);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;

  chatInput.value = "";
  addMsg("user", msg);
  history.push({ role: "user", text: msg });
  addTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, history }),
    });

    const { events } = await res.json();

    for (const event of events) {
      await sleep(300);

      if (event.type === "tool_call") {
        addToolEvent("tool_call", event.tool, { args: event.args, description: event.description });
      } else if (event.type === "tool_result") {
        addToolEvent("tool_result", event.tool, event.data);
        history.push({ role: "tool_result", data: event.data });
      } else if (event.type === "agent_reply") {
        removeTyping();
        addMsg("agent", event.text);
        history.push({ role: "agent", text: event.text });
      }
    }
  } catch (err) {
    removeTyping();
    addMsg("agent", "Something went wrong. Please try again.");
  }
});

// ───── View switching ─────
document.querySelectorAll(".topbar-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".topbar-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    const view = document.getElementById(`view-${tab.dataset.view}`);
    view.classList.add("active");

    if (tab.dataset.view === "ledger" || tab.dataset.view === "audit") {
      loadLedgerData();
    }
  });
});

// ───── Ledger / Audit data ─────
async function loadLedgerData() {
  try {
    const res = await fetch("/api/ledger");
    const data = await res.json();

    const statsRow = document.getElementById("statsRow");
    const stats = data.stats;
    statsRow.innerHTML = `
      <div class="stat-card"><div class="stat-label">Payments</div><div class="stat-value">${stats.total_payments}</div></div>
      <div class="stat-card"><div class="stat-label">Volume</div><div class="stat-value">${stats.total_volume}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${stats.pending_payments}</div></div>
      <div class="stat-card"><div class="stat-label">Customers</div><div class="stat-value">${stats.customers}</div></div>
      <div class="stat-card"><div class="stat-label">Audit Entries</div><div class="stat-value">${stats.audit_entries}</div></div>
    `;

    const body = document.getElementById("ledgerBody");
    body.innerHTML = data.recentPayments
      .map((p) => {
        const statusClass = p.status.toLowerCase().replace("_", "_");
        return `<tr>
          <td><code style="font-size:11px">${p.id}</code></td>
          <td>${p.amount}</td>
          <td>${p.recipient}</td>
          <td>${p.memo}</td>
          <td><span class="status-badge ${statusClass}">${p.status}</span></td>
          <td>${new Date(p.date).toLocaleDateString()}</td>
        </tr>`;
      })
      .join("");

    const auditEl = document.getElementById("auditLog");
    auditEl.innerHTML = data.audit
      .reverse()
      .map((a) => {
        let actionClass = "list";
        if (a.action.includes("PAYMENT_CREATED")) actionClass = "payment";
        else if (a.action.includes("BALANCE")) actionClass = "balance";
        else if (a.action.includes("BLOCKED") || a.action.includes("DENIED")) actionClass = "blocked";
        else if (a.action.includes("WARNING") || a.action.includes("DUPLICATE")) actionClass = "warning";

        const time = new Date(a.timestamp).toLocaleTimeString();
        const details = Object.entries(a)
          .filter(([k]) => !["id", "timestamp", "action"].includes(k))
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join(" | ");

        return `<div class="audit-entry">
          <span class="audit-time">${time}</span>
          <span class="audit-action ${actionClass}">${a.action}</span>
          <span class="audit-detail">${details}</span>
        </div>`;
      })
      .join("");
  } catch (e) {
    console.error("Failed to load ledger data:", e);
  }
}
