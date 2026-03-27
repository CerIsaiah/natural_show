export function renderOutcome(container, scenario) {
  container.innerHTML = '';

  const comparison = document.createElement('div');
  comparison.className = 'outcome-comparison';
  comparison.innerHTML = `
    <div class="outcome-card human-card">
      <div class="outcome-card-title">
        <span style="font-size:16px">&#9679;</span> Human Flow
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Total Time</span>
        <span class="outcome-stat-value" style="color:var(--amber)">${scenario.humanTime}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Steps Taken</span>
        <span class="outcome-stat-value">${scenario.humanEvents.length}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Manual Errors</span>
        <span class="outcome-stat-value" style="color:var(--red)">${getHumanErrors(scenario)}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Approval Method</span>
        <span class="outcome-stat-value">${getHumanApproval(scenario)}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Audit Trail</span>
        <span class="outcome-stat-value" style="color:var(--red)">Fragmented</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Rollback Capability</span>
        <span class="outcome-stat-value" style="color:var(--amber)">Manual</span>
      </div>
    </div>
    <div class="outcome-card agent-card">
      <div class="outcome-card-title">
        <span style="font-size:16px">&#9679;</span> Agent Flow
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Total Time</span>
        <span class="outcome-stat-value" style="color:var(--cyan)">${scenario.agentTime}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Steps Taken</span>
        <span class="outcome-stat-value">${scenario.agentEvents.length}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Execution Errors</span>
        <span class="outcome-stat-value" style="color:var(--green)">0</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Approval Method</span>
        <span class="outcome-stat-value">${getAgentApproval(scenario)}</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Audit Trail</span>
        <span class="outcome-stat-value" style="color:var(--green)">Complete Chain</span>
      </div>
      <div class="outcome-stat">
        <span class="outcome-stat-label">Rollback Capability</span>
        <span class="outcome-stat-value" style="color:var(--green)">Automated</span>
      </div>
    </div>
  `;
  container.appendChild(comparison);

  const decisions = document.createElement('div');
  decisions.className = 'decision-section';
  decisions.innerHTML = `
    <div class="decision-title">Key Decision Points — Where Human and Agent Diverged</div>
    ${scenario.decisionPoints.map((dp, i) => `
      <div class="decision-point">
        <div class="dp-number">${i + 1}</div>
        <div class="dp-side human">
          <div class="dp-side-label">Human</div>
          <p>${dp.human}</p>
        </div>
        <div class="dp-side agent">
          <div class="dp-side-label">Agent</div>
          <p>${dp.agent}</p>
        </div>
      </div>
    `).join('')}
  `;
  container.appendChild(decisions);

  const trustSection = document.createElement('div');
  trustSection.className = 'trust-section';
  const categories = [
    { key: 'auditability', label: 'Auditability' },
    { key: 'consistency', label: 'Consistency' },
    { key: 'speed', label: 'Speed' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'rollback', label: 'Rollback Safety' },
  ];

  trustSection.innerHTML = `
    <div class="trust-title">Trust & Safety Scores</div>
    ${categories.map(cat => `
      <div class="trust-row">
        <span class="trust-label">${cat.label}</span>
        <div class="trust-bar-track">
          <div class="trust-bar-fill human" style="width: 0%" data-target="${scenario.trustScores.human[cat.key]}"></div>
        </div>
        <span class="trust-value" style="color:var(--amber)">${scenario.trustScores.human[cat.key]}%</span>
        <div class="trust-bar-track">
          <div class="trust-bar-fill agent" style="width: 0%" data-target="${scenario.trustScores.agent[cat.key]}"></div>
        </div>
        <span class="trust-value" style="color:var(--cyan)">${scenario.trustScores.agent[cat.key]}%</span>
      </div>
    `).join('')}
  `;
  container.appendChild(trustSection);

  requestAnimationFrame(() => {
    setTimeout(() => {
      trustSection.querySelectorAll('.trust-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    }, 200);
  });
}

function getHumanErrors(scenario) {
  const id = scenario.id;
  if (id === 'delegated-purchase') return '1';
  if (id === 'cross-border') return '2';
  if (id === 'emergency-repair') return '3';
  return '1';
}

function getHumanApproval(scenario) {
  const id = scenario.id;
  if (id === 'delegated-purchase') return 'Slack emoji';
  if (id === 'cross-border') return 'Email + OOO';
  if (id === 'emergency-repair') return 'Verbal/phone';
  return 'Informal';
}

function getAgentApproval(scenario) {
  const id = scenario.id;
  if (id === 'delegated-purchase') return 'Auto (in policy)';
  if (id === 'cross-border') return 'Crypto 2-of-2';
  if (id === 'emergency-repair') return 'Crypto 2-of-3';
  return 'Automated';
}
