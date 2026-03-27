'use strict';

/* ─── Utilities ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ─── Pause state ───────────────────────────────────────── */
let _paused = false;
let _pauseQueue = [];

function togglePause() {
  _paused = !_paused;
  if (!_paused) {
    const q = _pauseQueue.splice(0);
    q.forEach(r => r());
  }
  const btn = $('btnPause');
  const overlay = $('pauseOverlay');
  if (btn) {
    btn.classList.toggle('paused', _paused);
    btn.innerHTML = _paused
      ? '<svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><polygon points="1,0.5 12,6.5 1,12.5"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><rect x="1" y="0.5" width="4" height="12" rx="1.2"/><rect x="8" y="0.5" width="4" height="12" rx="1.2"/></svg>';
  }
  if (overlay) overlay.classList.toggle('is-on', _paused);
}

function waitIfPaused() {
  if (!_paused) return Promise.resolve();
  return new Promise(r => _pauseQueue.push(r));
}

const sleep = (ms) => {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => {
    const end = Date.now() + ms;
    const tick = async () => {
      await waitIfPaused();
      const rem = end - Date.now();
      if (rem <= 0) { resolve(); return; }
      setTimeout(tick, Math.min(100, rem));
    };
    setTimeout(tick, Math.min(100, ms));
  });
};

/* ─── Screen management ─────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ─── Scene layer helpers ───────────────────────────────── */
function showLayer(layerId) {
  $(layerId).classList.add('is-active');
}
function hideLayer(layerId) {
  $(layerId).classList.remove('is-active');
}
function hideAllLayers() {
  ['layerWalk', 'layerRail', 'layerData'].forEach(id => hideLayer(id));
}
function showDataItem(id) {
  const el = $(id);
  if (el) el.classList.remove('hidden');
}
function hideAllDataItems() {
  ['policyTree', 'vcardScene', 'auditChain'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
}

/* ─── Chapter overlay transitions ──────────────────────── */
async function chFadeOut() {
  $('chOverlay').classList.add('is-on');
  await sleep(440);
}
async function chFadeIn() {
  $('chOverlay').classList.remove('is-on');
  await sleep(440);
}

/* ─── Chapter label + dots ──────────────────────────────── */
function setChLabel(text, theme) {
  const el = $('chLabel');
  el.textContent = text;
  el.className = 'ch-label' + (theme ? ' ' + theme : '');
}

function buildDots(total, activeIdx, theme) {
  const el = $('chDots');
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'ch-dot';
    if (i < activeIdx) d.classList.add('done', theme);
    else if (i === activeIdx) d.classList.add('active', theme);
    el.appendChild(d);
  }
}

/* ─── Caption helpers ───────────────────────────────────── */
function setCaption(eyebrow, title, body, titleColor) {
  $('chCapEyebrow').textContent = eyebrow || '';
  $('chCapTitle').textContent = title || '';
  $('chCapTitle').style.color = titleColor || '';
  $('chCapBody').textContent = body || '';
  $('chCapEyebrow').classList.remove('is-in');
  $('chCapTitle').classList.remove('is-in');
  $('chCapBody').classList.remove('is-in');
}
async function revealCaption() {
  $('chCapEyebrow').classList.add('is-in');
  await sleep(350);
  $('chCapTitle').classList.add('is-in');
  await sleep(450);
  $('chCapBody').classList.add('is-in');
}
function clearCaption() {
  $('chCapEyebrow').classList.remove('is-in');
  $('chCapTitle').classList.remove('is-in');
  $('chCapBody').classList.remove('is-in');
}

/* ─── Time badge ────────────────────────────────────────── */
function showTimeBadge(text, type) {
  const el = $('chTimeBadge');
  el.textContent = text;
  el.className = 'ch-time-badge ' + type;
}
function hideTimeBadge() {
  $('chTimeBadge').classList.add('hidden');
}

/* ─── Terminal ──────────────────────────────────────────── */
function setTermText(text, color) {
  const el = $('termText');
  el.textContent = text;
  el.style.color = color || '#00ff88';
}
function pulseTerminal() {
  const t = $('terminal');
  t.classList.add('pulse');
  setTimeout(() => t.classList.remove('pulse'), 800);
}
function resetTerminal() {
  setTermText('READY', 'rgba(0,255,136,0.4)');
  $('terminal').classList.remove('lit');
}

/* ─── Sprite helpers ────────────────────────────────────── */
function getStopX(spriteId) {
  const scene = $('chScene');
  const terminal = $('terminal');
  const sceneW = scene.offsetWidth;
  const terminalRight = sceneW * 0.82;
  const offset = spriteId === 'sprHuman' ? 80 : 95;
  return terminalRight - offset;
}

function setSpriteLeft(id, x) {
  $(id).style.left = x + 'px';
}

async function walkSprite(id, targetX, durationMs) {
  const spr = $(id);
  spr.classList.add('walking');
  spr.style.transition = `left ${durationMs}ms linear`;
  spr.style.left = targetX + 'px';
  await sleep(durationMs + 60);
  spr.classList.remove('walking');
  spr.style.transition = '';
}

async function bounceSprite(id) {
  const spr = $(id);
  spr.classList.add('success');
  await sleep(750);
  spr.classList.remove('success');
}

function hideSprite(id) {
  const spr = $(id);
  spr.classList.add('hidden');
  spr.classList.remove('walking', 'success', 'is-aura');
}

function showSprite(id, startX) {
  const spr = $(id);
  spr.classList.remove('hidden');
  spr.style.left = (startX !== undefined ? startX : -90) + 'px';
  spr.style.transition = '';
}

/* ─── Rail helpers ──────────────────────────────────────── */
function resetRailDiagram(theme) {
  const rd = $('railDiagram');
  rd.className = 'rail-diagram ' + (theme || '');
  // Reset all nodes
  document.querySelectorAll('#railMain .rail-node').forEach(n => {
    n.className = 'rail-node';
  });
  // Reset all connectors
  document.querySelectorAll('#railMain .rail-conn').forEach(c => {
    c.classList.remove('active', 'done', 'reverse', 'visible');
    void c.offsetWidth;
  });
  // Reset control plane
  document.querySelectorAll('#railControl .rail-cnode').forEach(n => {
    n.classList.remove('active', 'done', 'visible');
  });
  document.querySelectorAll('#railControl .rail-clink').forEach(l => {
    l.classList.remove('visible');
  });
  $('railBeam').classList.remove('lit');
  // Hide approval banner
  $('rdApproval').classList.add('hidden');
  $('rdApproval').classList.remove('is-in');
  // Title
  $('rdTitle').textContent = theme === 'agent'
    ? 'Instrumented four-party rail'
    : 'Four-party authorization';
  // Reset packet tags visibility
  document.querySelectorAll('.rail-ptag').forEach(t => {
    t.style.display = theme === 'agent' ? '' : 'none';
  });
}

async function revealRailNodes(startVisible, fromIdx) {
  const nodes = document.querySelectorAll('#railMain .rail-node');
  const conns = document.querySelectorAll('#railMain .rail-conn');
  // startVisible = how many should already be "done" when scene opens
  for (let i = 0; i < nodes.length; i++) {
    const delay = Math.max(0, (i - (fromIdx || 0))) * 120;
    setTimeout(() => {
      nodes[i].classList.add('visible');
      if (i < (startVisible || 0)) nodes[i].classList.add('done');
    }, delay);
    if (i < conns.length) {
      setTimeout(() => {
        conns[i].classList.add('visible');
        if (i < (startVisible || 0)) conns[i].classList.add('done');
      }, delay + 60);
    }
  }
  await sleep((nodes.length - (fromIdx || 0)) * 120 + 200);
}

function activateRailNode(dataNode) {
  document.querySelectorAll('#railMain .rail-node').forEach(n => {
    if (n.dataset.node === dataNode) n.classList.add('active');
  });
}

function doneRailNode(dataNode) {
  document.querySelectorAll('#railMain .rail-node').forEach(n => {
    if (n.dataset.node === dataNode) {
      n.classList.remove('active');
      n.classList.add('done');
    }
  });
}

async function firePacket(seg, reverse) {
  const conns = document.querySelectorAll('#railMain .rail-conn');
  const conn = conns[seg];
  if (!conn) return;
  void conn.offsetWidth;
  conn.classList.remove('active', 'reverse');
  void conn.offsetWidth;
  conn.classList.add(reverse ? 'reverse' : 'active');
  await sleep(1050);
}

async function doneConn(seg) {
  const conns = document.querySelectorAll('#railMain .rail-conn');
  if (conns[seg]) {
    conns[seg].classList.remove('active', 'reverse');
    conns[seg].classList.add('done');
  }
}

/* ─── Agent control plane ───────────────────────────────── */
async function revealControlPlane() {
  const cnodes = document.querySelectorAll('#railControl .rail-cnode');
  const clinks = document.querySelectorAll('#railControl .rail-clink');
  for (let i = 0; i < cnodes.length; i++) {
    setTimeout(() => cnodes[i].classList.add('visible'), i * 200);
    if (i < clinks.length) {
      setTimeout(() => clinks[i].classList.add('visible'), i * 200 + 100);
    }
  }
  await sleep(cnodes.length * 200 + 200);
}

function activateControlNode(which) {
  document.querySelectorAll('#railControl .rail-cnode').forEach(n => {
    if (n.dataset.cnode === which) n.classList.add('active');
  });
}
function doneControlNode(which) {
  document.querySelectorAll('#railControl .rail-cnode').forEach(n => {
    if (n.dataset.cnode === which) {
      n.classList.remove('active');
      n.classList.add('done');
    }
  });
}

/* ─── Card vault ────────────────────────────────────────── */
const VAULT_CARDS = [
  { name: 'card_ops_general',   num: '•••• ••••', accent: 'rgba(0,212,255,0.15)' },
  { name: 'card_vendor_locked', num: '•••• ••••', accent: 'rgba(0,255,136,0.15)' },
  { name: 'card_travel',        num: '•••• ••••', accent: 'rgba(255,184,0,0.12)' },
  { name: 'card_infra',         num: '•••• ••••', accent: 'rgba(255,68,102,0.1)' },
];

async function openCardVault() {
  const vault = $('cardVault');
  vault.style.display = 'block';
  vault.innerHTML = '';

  const fanned = [-38, -14, 14, 38];
  const cards = VAULT_CARDS.map((data, i) => {
    const c = document.createElement('div');
    c.className = 'vault-card';
    c.style.setProperty('--card-accent', data.accent);
    c.innerHTML = `<div class="vc-chip"></div><div class="vc-name">${data.name}</div><div class="vc-num">${data.num}</div>`;
    vault.appendChild(c);
    return c;
  });

  // Fan out
  await sleep(100);
  cards.forEach((c, i) => {
    c.style.transition = `transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms, opacity 0.4s ease ${i * 60}ms`;
    c.style.opacity = '1';
    c.style.transform = `rotate(${fanned[i]}deg)`;
  });
  await sleep(700);

  // Select card 1 (card_vendor_aws)
  const chosenIdx = 1;
  cards.forEach((c, i) => {
    if (i !== chosenIdx) {
      c.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
      c.style.opacity = '0';
      c.style.transform = 'rotate(0deg) scale(0.7)';
    }
  });
  const chosen = cards[chosenIdx];
  chosen.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease';
  chosen.style.transform = 'rotate(0deg) scale(1.18) translateY(-16px)';
  await sleep(700);

  // Add aura to agent
  $('sprAgent').classList.add('is-aura');

  await sleep(400);
  // Collapse vault
  vault.style.display = 'none';
}

/* ─── JSON card reveal ──────────────────────────────────── */
async function revealJsonCard() {
  const card = $('jsonCard');
  const code = $('jcCode');

  const lines = [
    { key: 'action',           val: '"pay_vendor"',       color: 'str' },
    { key: 'merchant',         val: '"cloud_vendor"',   color: 'str' },
    { key: 'category',        val: '"software"',        color: 'str' },
    { key: 'amount',           val: '"one_bill"',       color: 'str' },
    { key: 'idempotency_key',  val: '"…unique_key"',    color: 'str' },
  ];

  code.innerHTML = '';
  code.insertAdjacentText('beforeend', '{\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const comma = i < lines.length - 1 ? ',' : '';
    code.innerHTML += `  <span class="jc-key">"${l.key}"</span><span class="jc-sym">: </span><span class="jc-${l.color}">${l.val}</span>${comma}\n`;
  }
  code.insertAdjacentText('beforeend', '}');

  card.classList.add('is-in');
}

function hideJsonCard() {
  $('jsonCard').classList.remove('is-in');
}

/* ─── Policy tree animation ─────────────────────────────── */
async function runPolicyTree() {
  const rules = [
    { name: 'Budget check',    detail: 'Under team ceiling for this quarter',   result: 'PASS' },
    { name: 'Velocity check',  detail: 'Spend pattern looks normal',             result: 'PASS' },
    { name: 'Category match',  detail: 'Vendor type is on the allow-list',       result: 'PASS' },
    { name: 'AML / sanctions', detail: 'Vendor cleared',                          result: 'PASS' },
  ];

  const container = $('ptRules');
  container.innerHTML = '';
  $('ptVerdict').classList.add('hidden');

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const el = document.createElement('div');
    el.className = 'pt-rule';
    el.innerHTML = `
      <div class="pt-rule-icon"></div>
      <div class="pt-rule-name">${r.name}</div>
      <div class="pt-rule-detail">${r.detail}</div>
      <div class="pt-badge ${r.result === 'PASS' ? 'pass' : 'fail'}">${r.result}</div>
    `;
    container.appendChild(el);
    await sleep(100);
    el.classList.add('is-in');
    await sleep(120);
    el.classList.add(r.result === 'PASS' ? 'pass' : 'fail');
    el.querySelector('.pt-rule-icon').textContent = r.result === 'PASS' ? '✓' : '✕';
    await sleep(700);
  }

  await sleep(500);
  const v = $('ptVerdict');
  v.classList.remove('hidden');
  await sleep(60);
  v.classList.add('is-in');
}

/* ─── Virtual card scene ─────────────────────────────────── */
async function runVcardScene() {
  const card = $('vcBig');
  $('vcLocks').innerHTML = '';

  await sleep(100);
  card.classList.add('is-in');
  await sleep(1000);

  const locks = [
    { text: '🔒 One vendor only',  cls: '' },
    { text: '💰 Spend capped',     cls: 'green' },
    { text: '⏱ Single use',        cls: '' },
  ];

  for (let i = 0; i < locks.length; i++) {
    const tag = document.createElement('div');
    tag.className = 'vc-lock-tag ' + locks[i].cls;
    tag.textContent = locks[i].text;
    $('vcLocks').appendChild(tag);
    await sleep(100);
    tag.classList.add('is-in');
    await sleep(600);
  }
}

/* ─── Audit chain ───────────────────────────────────────── */
async function runAuditChain() {
  const blocks = [
    {
      cls: 'intent-block',
      label: 'INTENT',
      fields: [
        ['action',   'pay_vendor'],
        ['merchant', 'cloud_vendor'],
        ['amount',   'one_invoice'],
        ['hash',     '(intent digest)'],
      ],
    },
    {
      cls: 'policy-block',
      label: 'POLICY',
      fields: [
        ['result',   'ALLOW'],
        ['rules',    'all gates passed'],
        ['prev',     '(links intent)'],
        ['hash',     '(policy digest)'],
      ],
    },
    {
      cls: 'auth-block',
      label: 'AUTH',
      fields: [
        ['code',     'APPROVED'],
        ['issuer',   'your_bank'],
        ['prev',     '(links policy)'],
        ['hash',     '(auth digest)'],
      ],
    },
  ];

  const container = $('acBlocks');
  container.innerHTML = '';

  for (let i = 0; i < blocks.length; i++) {
    if (i > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'ac-arrow';
      arrow.innerHTML = `<svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path d="M0 6h17M14 2l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      container.appendChild(arrow);
      setTimeout(() => arrow.classList.add('is-in'), 100);
    }

    const b = blocks[i];
    const el = document.createElement('div');
    el.className = 'ac-block ' + b.cls;
    const fieldsHtml = b.fields.map(([k, v]) =>
      `<div class="ac-block-field">${k}:${k === 'hash' || k === 'prev' ? ` <span class="ac-hash">${v}</span>` : ` <span>${v}</span>`}</div>`
    ).join('');
    el.innerHTML = `<div class="ac-block-label">${b.label}</div>${fieldsHtml}`;
    container.appendChild(el);

    await sleep(120);
    el.classList.add('is-in');
    await sleep(800);
  }
}

/* ═══════════════════════════════════════════════════════════
   CHAPTERS
   ═══════════════════════════════════════════════════════════ */

/* H1 — Cardholder approaches terminal */
async function chH1() {
  await chFadeOut();

  setChLabel('HUMAN · 1 of 4', 'amber');
  buildDots(4, 0, 'amber');

  hideAllLayers();
  showLayer('layerWalk');
  hideSprite('sprHuman');
  hideSprite('sprAgent');
  hideJsonCard();
  resetTerminal();

  setCaption(
    'FOUR-PARTY FLOW',
    'A card payment is handed off across four institutions before settlement runs.',
    'The cardholder only sees the merchant. Behind that, the merchant side, the network, and the issuing bank each take a step. Clearing and batch settlement assume this authorization path has already completed.',
    'var(--amber)'
  );

  await chFadeIn();

  showSprite('sprHuman', -90);
  const stopX = getStopX('sprHuman');
  await walkSprite('sprHuman', stopX, 1550);

  setTermText('INSERT\nCARD', '#ffb800');
  pulseTerminal();
  $('terminal').classList.add('lit');

  await sleep(500);
  await revealCaption();
  await sleep(3000);

  setTermText('READING...', 'var(--cyan)');
  clearCaption();
  await sleep(300);
}

/* H2 — Capture + Acquirer */
async function chH2() {
  await chFadeOut();

  setChLabel('HUMAN · 2 of 4', 'amber');
  buildDots(4, 1, 'amber');

  hideAllLayers();
  showLayer('layerRail');
  resetRailDiagram('human');

  setCaption(
    'ACQUIRER',
    'The merchant\'s bank or processor receives the payment request first.',
    'That party sits between the checkout and the wider network. When amounts or auth data disagree later during reconciliation, the investigation usually starts with what was captured at this hop.',
    'var(--amber)'
  );

  await chFadeIn();

  await revealRailNodes(0, 0);
  await sleep(280);

  activateRailNode('pos');
  await sleep(450);
  await firePacket(0);
  activateRailNode('acq');
  doneRailNode('pos');

  await sleep(500);
  await revealCaption();
  await sleep(3000);

  doneRailNode('acq');
  doneConn(0);
  clearCaption();
  await sleep(300);
}

/* H3 — Network routes to Issuer */
async function chH3() {
  await chFadeOut();

  setChLabel('HUMAN · 3 of 4', 'amber');
  buildDots(4, 2, 'amber');

  hideAllLayers();
  showLayer('layerRail');
  resetRailDiagram('human');

  setCaption(
    'NETWORK AND ISSUER',
    'The network routes the authorization to the bank that issued the card.',
    'The network carries standardized messages between participants; it does not hold the cardholder\'s balance. The issuer evaluates the request and returns approve or decline from the perspective of that cardholder\'s account and policy.',
    'var(--amber)'
  );

  await chFadeIn();

  await revealRailNodes(2, 0);
  await sleep(280);

  activateRailNode('net');
  await sleep(450);
  await firePacket(1);
  await sleep(160);
  await firePacket(2);
  activateRailNode('iss');
  doneRailNode('net');

  await sleep(500);
  await revealCaption();
  await sleep(3000);

  doneRailNode('iss');
  doneConn(1);
  doneConn(2);
  clearCaption();
  await sleep(300);
}

/* H4 — Auth response + T+1 */
async function chH4() {
  await chFadeOut();

  setChLabel('HUMAN · 4 of 4', 'amber');
  buildDots(4, 3, 'amber');

  hideAllLayers();
  showLayer('layerRail');
  resetRailDiagram('human');

  setCaption(
    'AUTHORIZATION VS SETTLEMENT',
    'Approval at checkout does not finish all downstream reconciliation.',
    'The cardholder may see a successful authorization in seconds. Clearing, file exchange, and settlement still follow and can run on a different schedule. In clearing, most of the work is often about closing that gap rather than replaying the initial approval signal.',
    'var(--amber)'
  );

  await chFadeIn();

  const nodes = document.querySelectorAll('#railMain .rail-node');
  const conns = document.querySelectorAll('#railMain .rail-conn');
  nodes.forEach((n, i) => {
    setTimeout(() => {
      n.classList.add('visible');
      if (i < 3) n.classList.add('done');
      else n.classList.add('active');
    }, i * 60);
  });
  conns.forEach((c, i) => {
    setTimeout(() => {
      c.classList.add('visible');
      if (i < 2) c.classList.add('done');
    }, i * 60 + 35);
  });
  await sleep(400);

  await firePacket(2, true);
  doneConn(2);
  await sleep(90);
  await firePacket(1, true);
  doneConn(1);
  await sleep(90);
  await firePacket(0, true);
  doneConn(0);
  nodes.forEach(n => { n.classList.remove('active'); n.classList.add('done'); });

  const banner = $('rdApproval');
  banner.classList.remove('hidden');
  await sleep(60);
  banner.classList.add('is-in');

  showTimeBadge('Human pace', 'slow');

  await sleep(450);
  await revealCaption();
  await sleep(3000);

  hideTimeBadge();
  clearCaption();
  await sleep(300);
}

/* BRIDGE */
async function runBridge() {
  showScreen('s-bridge');
  const q = $('bridgeQ');
  const ans = $('bridgeAns');
  q.style.opacity = '0';
  q.style.transform = 'translateY(16px)';
  ans.style.opacity = '0';

  q.textContent = 'The card rails are unchanged whether a person or software initiates payment.\nWhat changes is how you represent intent, enforce policy, and retain evidence.\n\nWhat follows is the agent section: same rails, with software-facing layers first.';
  ans.textContent = 'intent · policy · instrument · audit record';

  await sleep(300);
  q.style.opacity = '1';
  q.style.transform = 'translateY(0)';
  await sleep(900);
  ans.style.opacity = '1';
  await sleep(4000);

  q.style.opacity = '0';
  ans.style.opacity = '0';
  await sleep(600);
  showScreen('s-demo');
}

/* A1 — Agent intent layer */
async function chA1() {
  await chFadeOut();

  setChLabel('AGENT SECTION · 1 of 5', 'cyan');
  buildDots(5, 0, 'cyan');

  hideAllLayers();
  showLayer('layerWalk');
  hideSprite('sprHuman');
  hideSprite('sprAgent');
  hideJsonCard();
  resetTerminal();

  setCaption(
    'Why I start here',
    'Software should own who said "charge this" and how retries stay safe.',
    'Most integrations assume a person at checkout. When software pays, two ideas keep coming up: be explicit about who approved the spend, and design retries so a timeout does not turn into a double charge. Everything else in agent payments tends to hang off those two.',
    'var(--cyan)'
  );

  await chFadeIn();

  showSprite('sprAgent', -90);
  const stopX = getStopX('sprAgent');
  await walkSprite('sprAgent', stopX, 2200);

  setTermText('CONNECTING', 'var(--cyan)');
  $('terminal').classList.add('lit');

  await revealJsonCard();

  await sleep(1400);
  await revealCaption();
  await sleep(7000);

  clearCaption();
  hideJsonCard();
  await sleep(400);
}

/* A2 — Policy gate */
async function chA2() {
  await chFadeOut();

  setChLabel('AGENT SECTION · 2 of 5', 'cyan');
  buildDots(5, 1, 'cyan');

  hideAllLayers();
  showLayer('layerData');
  hideAllDataItems();
  showDataItem('policyTree');

  setCaption(
    'Where I put policy',
    'I want explainable rules in front, and scores behind them when we can.',
    'Networks often use models and scores for risk. You can still require plain rules first: same inputs, same yes or no, with a reason someone can read later. The big idea is deciding what must be explainable up front versus what can stay statistical.\n\nThe sensible boundary probably shifts between a consumer app and a large company program, but the table stakes are similar: when something is investigated, you need a story that is not only "the model said so."',
    'var(--cyan)'
  );

  await chFadeIn();

  await runPolicyTree();

  await sleep(1000);
  await revealCaption();
  await sleep(7500);

  clearCaption();
  await sleep(400);
}

/* A3 — Virtual card issuance */
async function chA3() {
  await chFadeOut();

  setChLabel('AGENT SECTION · 3 of 5', 'cyan');
  buildDots(5, 2, 'cyan');

  hideAllLayers();
  showLayer('layerWalk');
  showLayer('layerData');
  hideAllDataItems();
  showDataItem('vcardScene');

  $('vcBig').classList.remove('is-in');
  $('vcLocks').innerHTML = '';
  $('sprAgent').classList.remove('is-aura');

  setCaption(
    'How I use virtual cards',
    'I shape the card to the approval, then shut it down when the job ends.',
    'Virtual cards are already normal. The agent angle is straightforward: cap, vendor, and time window should match what was approved, and the card should go away when the job is done so limits do not drift from the ticket.\n\nI treat the card as something policy produces—not a separate manual step—so product and risk share the same picture.',
    'var(--cyan)'
  );

  await chFadeIn();

  showSprite('sprAgent', getStopX('sprAgent'));
  await sleep(300);
  await openCardVault();
  await sleep(600);

  await runVcardScene();

  await sleep(1000);
  await revealCaption();
  await sleep(7000);

  clearCaption();
  await sleep(400);
}

/* A4 — Same rails, instrumented */
async function chA4() {
  await chFadeOut();

  setChLabel('AGENT SECTION · 4 of 5', 'cyan');
  buildDots(5, 3, 'cyan');

  hideAllLayers();
  showLayer('layerRail');
  resetRailDiagram('agent');

  setCaption(
    'What I keep saying about the rails',
    'Same hops—and I only trust what actually lands in clearing files.',
    'You still move merchant to acquirer to network to issuer. The extra layer is making sure intent and policy references ride along on the real clearing path—not only in a spreadsheet—so months later operations can follow the money without hunting through side channels.\n\nIf the story never shows up in what gets batched and settled, it\'s not really part of how cards work today, regardless of how nice the dashboard looks.',
    'var(--cyan)'
  );

  await chFadeIn();

  await revealControlPlane();
  activateControlNode('intent');
  await sleep(500);
  $('railBeam').classList.add('lit');
  activateControlNode('policy');
  await sleep(500);
  activateControlNode('vcard');
  await sleep(600);
  doneControlNode('intent');
  doneControlNode('policy');
  doneControlNode('vcard');

  await revealRailNodes(0, 0);
  await sleep(500);

  activateRailNode('pos');
  await sleep(600);
  await firePacket(0);
  activateRailNode('acq');
  doneRailNode('pos');
  await sleep(500);
  await firePacket(1);
  activateRailNode('net');
  doneRailNode('acq');
  await sleep(500);
  await firePacket(2);
  activateRailNode('iss');
  doneRailNode('net');
  await sleep(700);

  await firePacket(2, true);
  await sleep(200);
  await firePacket(1, true);
  await sleep(200);
  await firePacket(0, true);

  document.querySelectorAll('#railMain .rail-node').forEach(n => {
    n.classList.remove('active');
    n.classList.add('done');
  });
  document.querySelectorAll('#railMain .rail-conn').forEach(c => {
    c.classList.remove('active', 'reverse');
    c.classList.add('done');
  });

  await sleep(1000);
  await revealCaption();
  await sleep(7000);

  clearCaption();
  await sleep(400);
}

/* A5 — Cryptographic audit chain */
async function chA5() {
  await chFadeOut();

  setChLabel('AGENT SECTION · 5 of 5', 'cyan');
  buildDots(5, 4, 'cyan');

  hideAllLayers();
  showLayer('layerData');
  hideAllDataItems();
  showDataItem('auditChain');

  setCaption(
    'How I want the record to read',
    'One ordered trail from the ask, through the decision, to the auth.',
    'When something looks wrong after settlement, someone walks backward from the charge to the original ask without guessing. Linking steps in order—often with hashes—is a simple picture for how you preserve that story.\n\nFor large or sensitive spends, partners and regulators may still expect people in the loop; the chain supports the conversation instead of replacing it.',
    'var(--cyan)'
  );

  await chFadeIn();

  await runAuditChain();

  showTimeBadge('Agent pace', 'fast');

  await sleep(1200);
  await revealCaption();
  await sleep(7500);

  hideTimeBadge();
  clearCaption();
  await sleep(400);
}

/* ─── Outro ──────────────────────────────────────────────── */
async function runOutro() {
  showScreen('s-outro');
  const oH = $('oHuman');
  const oA = $('oAgent');
  oH.classList.remove('visible');
  oA.classList.remove('visible');

  await sleep(400);
  oH.classList.add('visible');
  await sleep(300);
  oA.classList.add('visible');
}

/* ─── Main sequence ──────────────────────────────────────── */
async function start() {
  // Reset pause state on (re)start
  if (_paused) togglePause();
  showScreen('s-demo');

  await chH1();
  await chH2();
  await chH3();
  await chH4();

  await runBridge();

  await chA1();
  await chA2();
  await chA3();
  await chA4();
  await chA5();

  await runOutro();
}

/* ─── Boot ───────────────────────────────────────────────── */
$('btnAboutNav').addEventListener('click', () => showScreen('s-landing'));
$('btnAboutCta').addEventListener('click', () => showScreen('s-landing'));
$('btnPlay').addEventListener('click', start);
$('btnReplay').addEventListener('click', () => showScreen('s-about'));

// Pause: button + spacebar + click anywhere on scene
$('btnPause').addEventListener('click', togglePause);
$('chScene').addEventListener('click', togglePause);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    const demo = document.getElementById('s-demo');
    if (demo && demo.classList.contains('active')) togglePause();
  }
});
