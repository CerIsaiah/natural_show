import { SCENARIOS } from './scenarios.js';

export function renderLanding(container, onSelect) {
  container.innerHTML = '';

  SCENARIOS.forEach((scenario, index) => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.scenario = index;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', scenario.title + ' - ' + scenario.amount);

    const riskLabel = scenario.risk === 'critical' ? 'CRITICAL RISK' : scenario.risk.toUpperCase() + ' RISK';
    const riskClass = scenario.risk === 'critical' ? 'high' : scenario.risk;

    card.innerHTML = `
      <div class="card-icon ${scenario.color}">
        <span>${scenario.icon}</span>
      </div>
      <div class="card-number">SCENARIO ${String(index + 1).padStart(2, '0')}</div>
      <div class="card-title">${scenario.title}</div>
      <div class="card-amount ${scenario.color}">${scenario.amount}</div>
      <div class="card-desc">${scenario.description}</div>
      <div class="card-badges">
        ${scenario.badges.map(b => `<span class="risk-badge ${b.level}">${b.label}</span>`).join('')}
      </div>
      <div class="card-cta">
        Launch simulation
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `;

    card.addEventListener('click', () => onSelect(index));
    container.appendChild(card);
  });
}
