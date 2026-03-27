export class SimulationEngine {
  constructor({ scenario, graph, onStep, onComplete, onTick }) {
    this.scenario = scenario;
    this.graph = graph;
    this.onStep = onStep;
    this.onComplete = onComplete;
    this.onTick = onTick;

    this.allEvents = this._mergeAndSort(scenario.humanEvents, scenario.agentEvents);
    this.currentIndex = 0;
    this.playing = false;
    this.speed = 1;
    this.startTime = 0;
    this.elapsed = 0;
    this._timer = null;
    this._tickTimer = null;
    this.humanElapsed = 0;
    this.agentElapsed = 0;
  }

  _mergeAndSort(humanEvents, agentEvents) {
    const tagged = [
      ...humanEvents.map((e, i) => ({ ...e, target: 'human', _origIndex: i })),
      ...agentEvents.map((e, i) => ({ ...e, target: 'agent', _origIndex: i })),
    ];
    tagged.sort((a, b) => {
      if (a.target === b.target) return a.time - b.time;
      if (a._origIndex !== b._origIndex) return a._origIndex - b._origIndex;
      return a.target === 'human' ? -1 : 1;
    });

    const interleaved = [];
    let hi = 0, ai = 0;
    const h = humanEvents.map((e, i) => ({ ...e, target: 'human', _origIndex: i }));
    const a = agentEvents.map((e, i) => ({ ...e, target: 'agent', _origIndex: i }));

    while (hi < h.length || ai < a.length) {
      if (hi < h.length) {
        interleaved.push(h[hi]);
        hi++;
      }
      if (ai < a.length) {
        interleaved.push(a[ai]);
        ai++;
      }
    }

    return interleaved;
  }

  get totalEvents() {
    return this.allEvents.length;
  }

  get progress() {
    if (this.totalEvents === 0) return 0;
    return this.currentIndex / this.totalEvents;
  }

  get isComplete() {
    return this.currentIndex >= this.totalEvents;
  }

  play() {
    if (this.playing) return;
    if (this.isComplete) return;

    this.playing = true;
    this.startTime = performance.now() - this.elapsed;
    this._scheduleNext();
    this._startTicker();
  }

  pause() {
    this.playing = false;
    clearTimeout(this._timer);
    clearInterval(this._tickTimer);
  }

  setSpeed(s) {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.speed = s;
    if (wasPlaying) this.play();
  }

  reset() {
    this.pause();
    this.currentIndex = 0;
    this.elapsed = 0;
    this.humanElapsed = 0;
    this.agentElapsed = 0;
    this.graph.reset();
  }

  _scheduleNext() {
    if (!this.playing || this.isComplete) {
      if (this.isComplete && this.playing) {
        this.playing = false;
        clearInterval(this._tickTimer);
        this.graph.completeAll();
        this.onComplete?.();
      }
      return;
    }

    const baseDelay = 1200;
    const delay = baseDelay / this.speed;

    this._timer = setTimeout(() => {
      this._executeStep();
      this._scheduleNext();
    }, delay);
  }

  _executeStep() {
    if (this.isComplete) return;

    const event = this.allEvents[this.currentIndex];
    this.currentIndex++;

    if (event.target === 'agent') {
      this.agentElapsed = event.time;
      this.graph.activateSequence(event.layer);
    } else {
      this.humanElapsed = event.time;
    }

    this.elapsed = performance.now() - this.startTime;

    this.onStep?.(event, this.currentIndex, this.totalEvents);
    this.onTick?.(this.progress, this.humanElapsed, this.agentElapsed);
  }

  _startTicker() {
    this._tickTimer = setInterval(() => {
      this.elapsed = performance.now() - this.startTime;
      this.onTick?.(this.progress, this.humanElapsed, this.agentElapsed);
    }, 500);
  }
}

export function createStepCard(event) {
  const div = document.createElement('div');
  const cardClass = event.success ? 'success' : (event.layer === 'escalation' || event.layer === 'rollback') ? 'escalate' : event.cardType;
  div.className = `step-card ${cardClass}`;

  const layerClass = event.layer || 'informal';

  div.innerHTML = `
    <div class="step-header">
      <span class="step-layer ${layerClass}">${(event.layer || 'action').toUpperCase()}</span>
      <span class="step-action">${escapeHtml(event.action)}</span>
    </div>
    ${event.detail ? `<div class="step-detail">${escapeHtml(event.detail)}</div>` : ''}
  `;

  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatSimTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
