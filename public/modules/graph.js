import { LAYERS } from './scenarios.js';

const NS = 'http://www.w3.org/2000/svg';

const NODE_W = 140;
const NODE_H = 42;
const GAP_Y = 22;
const START_Y = 16;
const CX = 120;

const BRANCH_NODE = { id: 'escalation', label: 'Escalate / Rollback', icon: '↗' };

const GRAPH_NODES = [
  ...LAYERS,
  BRANCH_NODE,
];

function nodeY(index) {
  return START_Y + index * (NODE_H + GAP_Y);
}

function createSVGElement(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

export class ExecutionGraph {
  constructor(svgElement) {
    this.svg = svgElement;
    this.nodes = new Map();
    this.edges = [];
    this.particles = [];
    this._build();
  }

  _build() {
    this.svg.innerHTML = '';

    const totalH = nodeY(GRAPH_NODES.length) + NODE_H;
    this.svg.setAttribute('viewBox', `0 0 300 ${totalH}`);

    const defs = createSVGElement('defs');

    const filter = createSVGElement('filter', { id: 'glowFilter', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    const blur = createSVGElement('feGaussianBlur', { stdDeviation: '3', result: 'glow' });
    const merge = createSVGElement('feMerge');
    const mn1 = createSVGElement('feMergeNode', { in: 'glow' });
    const mn2 = createSVGElement('feMergeNode', { in: 'SourceGraphic' });
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);

    const grad = createSVGElement('linearGradient', { id: 'edgeGradActive', x1: '0', y1: '0', x2: '0', y2: '1' });
    const stop1 = createSVGElement('stop', { offset: '0%', 'stop-color': '#00d4ff', 'stop-opacity': '0.8' });
    const stop2 = createSVGElement('stop', { offset: '100%', 'stop-color': '#00ff88', 'stop-opacity': '0.8' });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    this.svg.appendChild(defs);

    const edgesGroup = createSVGElement('g', { class: 'edges-layer' });
    const nodesGroup = createSVGElement('g', { class: 'nodes-layer' });

    for (let i = 0; i < LAYERS.length - 1; i++) {
      const y1 = nodeY(i) + NODE_H;
      const y2 = nodeY(i + 1);
      const edge = this._createEdge(CX, y1, CX, y2, `edge-${LAYERS[i].id}-${LAYERS[i + 1].id}`);
      edgesGroup.appendChild(edge.group);
      this.edges.push({ from: LAYERS[i].id, to: LAYERS[i + 1].id, ...edge });
    }

    const commitIdx = 5;
    const branchIdx = 7;
    const branchX = CX + 80;
    const branchTopY = nodeY(branchIdx);
    const branchEdge = this._createBranchEdge(CX + NODE_W / 2, nodeY(commitIdx) + NODE_H / 2, branchX, branchTopY, 'edge-commit-escalation');
    edgesGroup.appendChild(branchEdge.group);
    this.edges.push({ from: 'commit', to: 'escalation', ...branchEdge });

    this.svg.appendChild(edgesGroup);

    LAYERS.forEach((layer, i) => {
      const g = this._createNode(layer, CX, nodeY(i));
      nodesGroup.appendChild(g);
      this.nodes.set(layer.id, { element: g, index: i });
    });

    const branchG = this._createNode(BRANCH_NODE, branchX, nodeY(branchIdx));
    nodesGroup.appendChild(branchG);
    this.nodes.set('escalation', { element: branchG, index: branchIdx });

    this.svg.appendChild(nodesGroup);
  }

  _createNode(layer, cx, y) {
    const g = createSVGElement('g', { class: 'graph-node', 'data-node': layer.id });
    const x = cx - NODE_W / 2;

    const glow = createSVGElement('rect', {
      class: 'node-glow',
      x: x - 3,
      y: y - 3,
      width: NODE_W + 6,
      height: NODE_H + 6,
      rx: '12',
    });

    const bg = createSVGElement('rect', {
      class: 'node-bg',
      x, y,
      width: NODE_W,
      height: NODE_H,
      rx: '10',
    });

    const icon = createSVGElement('text', {
      class: 'node-icon',
      x: x + 18,
      y: y + NODE_H / 2 + 5,
      'font-size': '14',
      'text-anchor': 'middle',
    });
    icon.textContent = layer.icon;

    const label = createSVGElement('text', {
      class: 'node-label',
      x: cx + 8,
      y: y + NODE_H / 2 + 4,
      'font-size': '11',
      'text-anchor': 'middle',
    });
    label.textContent = layer.label;

    g.appendChild(glow);
    g.appendChild(bg);
    g.appendChild(icon);
    g.appendChild(label);

    return g;
  }

  _createEdge(x1, y1, x2, y2, id) {
    const group = createSVGElement('g', { 'data-edge': id });

    const line = createSVGElement('line', {
      class: 'graph-edge',
      x1, y1, x2, y2,
    });

    const particle = createSVGElement('circle', {
      class: 'edge-particle',
      cx: x1,
      cy: y1,
      r: '3',
    });

    group.appendChild(line);
    group.appendChild(particle);

    return { group, line, particle, x1, y1, x2, y2 };
  }

  _createBranchEdge(x1, y1, x2, y2, id) {
    const group = createSVGElement('g', { 'data-edge': id });

    const path = createSVGElement('path', {
      class: 'graph-edge',
      d: `M${x1},${y1} C${x1 + 40},${y1} ${x2},${y2 - 20} ${x2},${y2}`,
      fill: 'none',
    });

    const particle = createSVGElement('circle', {
      class: 'edge-particle',
      cx: x1,
      cy: y1,
      r: '3',
    });

    group.appendChild(path);
    group.appendChild(particle);

    return { group, line: path, particle, x1, y1, x2, y2, isCurve: true };
  }

  setNodeState(nodeId, state) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const el = node.element;
    el.classList.remove('active', 'complete', 'failed', 'escalated');
    if (state) {
      el.classList.add(state);
    }
  }

  activateEdge(fromId, toId) {
    const edge = this.edges.find(e => e.from === fromId && e.to === toId);
    if (!edge) return;

    edge.line.classList.add('active');
    this._animateParticle(edge);
  }

  completeEdge(fromId, toId) {
    const edge = this.edges.find(e => e.from === fromId && e.to === toId);
    if (!edge) return;
    edge.line.classList.remove('active');
    edge.line.classList.add('complete');
  }

  _animateParticle(edge) {
    const particle = edge.particle;
    particle.classList.add('moving');

    const duration = 600;
    const start = performance.now();

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t * t * (3 - 2 * t);

      if (edge.isCurve) {
        const path = edge.line;
        const point = path.getPointAtLength(path.getTotalLength() * eased);
        particle.setAttribute('cx', point.x);
        particle.setAttribute('cy', point.y);
      } else {
        particle.setAttribute('cx', edge.x1 + (edge.x2 - edge.x1) * eased);
        particle.setAttribute('cy', edge.y1 + (edge.y2 - edge.y1) * eased);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.classList.remove('moving');
      }
    };

    requestAnimationFrame(animate);
  }

  reset() {
    for (const [id] of this.nodes) {
      this.setNodeState(id, null);
    }
    for (const edge of this.edges) {
      edge.line.classList.remove('active', 'complete');
      edge.particle.classList.remove('moving');
    }
  }

  activateSequence(layerId) {
    const layerOrder = LAYERS.map(l => l.id);
    const targetIdx = layerOrder.indexOf(layerId);
    if (targetIdx < 0) {
      if (layerId === 'escalation') {
        this.setNodeState('escalation', 'escalated');
        this.activateEdge('commit', 'escalation');
      }
      return;
    }

    this.setNodeState(layerId, 'active');

    if (targetIdx > 0) {
      const prevId = layerOrder[targetIdx - 1];
      this.setNodeState(prevId, 'complete');
      this.activateEdge(prevId, layerId);

      if (targetIdx > 1) {
        this.completeEdge(layerOrder[targetIdx - 2], prevId);
      }
    }
  }

  completeAll() {
    for (const layer of LAYERS) {
      this.setNodeState(layer.id, 'complete');
    }
    for (const edge of this.edges) {
      edge.line.classList.remove('active');
      edge.line.classList.add('complete');
    }
  }
}
