                 // ========================================
// SOUND SYSTEM
// ========================================

const sss = window.sss;

// Initialize sound
function initSound() {
    if (sss) {
        sss.init();
        sss.setMasterVolume(0.5);
        console.log("🎵 Sound system ready!");
    }
}

// Start audio (must be called after user interaction)
function startAudio() {
    if (sss && !sss.state.audioStarted) {
        sss.startAudio();
        console.log("🔊 Audio started!");
    }
}

// Play sound effects
function playSound(type) {
    if (!sss) return;
    if (!sss.state.audioStarted) {
        // Auto-start on first sound attempt
        sss.startAudio();
    }
    
    const sounds = {
        'part': 'select',
        'launch': 'tone',
        'success': 'coin',
        'explosion': 'explosion',
        'error': 'error',
        'click': 'click',
        'remove': 'click'
    };
    
    const soundName = sounds[type] || 'click';
    try {
        sss.playSoundEffect(soundName);
    } catch(e) {
        // Silent fail if sound not available
    }
}

// ========================================
// YOUR EXISTING GAME CODE GOES BELOW
// ========================================

// ... (your existing game.js code here)    /* ============================================================
   STACK & LAUNCH — Rocket Assembly Blueprint
   Simplified single-axis Tsiolkovsky rocket-building game.
   ============================================================ */

const G0 = 9.81;

/* ---------------- Parts catalog ---------------- */
/* Stats are loosely inspired by real vehicles (Soyuz, N1, Shuttle,
   Raptor, Orion) but simplified/rebalanced for gameplay. */

const PARTS = {
  capsule: [
    { id: 'vostok', name: 'Vostok Capsule', mass: 2460, cost: 500, h: 46,
      desc: 'Single-seat spherical descent module.' },
    { id: 'soyuz',  name: 'Soyuz Descent Module', mass: 2900, cost: 650, h: 50,
      desc: '3-seat reentry capsule.' },
    { id: 'orion',  name: 'Orion Crew Module', mass: 8900, cost: 1400, h: 60,
      desc: 'Deep-space capsule with abort tower.' },
    { id: 'fairing',name: 'Cargo Fairing', mass: 1700, cost: 350, h: 55,
      desc: 'Payload shroud for satellites.' }
  ],
  engine: [
    { id: 'rd107',  name: 'RD-107/108', thrust: 1000, isp: 320, mass: 1250, cost: 900,  fuel: 'kerolox', h: 34 },
    { id: 'nk33',   name: 'NK-33',      thrust: 1638, isp: 331, mass: 1222, cost: 1050, fuel: 'kerolox', h: 32 },
    { id: 'ssme',   name: 'SSME (RS-25)', thrust: 2279, isp: 452, mass: 3177, cost: 2200, fuel: 'hydrolox', h: 40 },
    { id: 'raptor', name: 'Raptor 2',   thrust: 2300, isp: 350, mass: 1600, cost: 1300, fuel: 'methalox', h: 30 },
    { id: 'rd124',  name: 'RD-124 (Upper Stage)', thrust: 30, isp: 340, mass: 65, cost: 400, fuel: 'kerolox', h: 20 }
  ],
  nozzle: [
    { id: 'bell',      name: 'Bell Nozzle',      ispMult: 1.00, thrustMult: 1.00, mass: 60,  cost: 100, h: 16,
      desc: 'Most efficient — standard on modern rockets.' },
    { id: 'conical',   name: 'Conical Nozzle',   ispMult: 0.85, thrustMult: 0.92, mass: 40,  cost: 50,  h: 14,
      desc: 'Simple and cheap, lower performance.' },
    { id: 'aerospike', name: 'Aerospike Nozzle', ispMult: 1.10, thrustMult: 1.02, mass: 110, cost: 320, h: 18,
      desc: 'Altitude-compensating, complex to build.' }
  ],
  tank: [
    { id: 'ktank_s', name: 'Kerolox Tank (S)', dry: 800,  fuel: 4000,  cost: 300, propellant: 'kerolox',  h: 60 },
    { id: 'ktank_l', name: 'Kerolox Tank (L)', dry: 2200, fuel: 12000, cost: 700, propellant: 'kerolox',  h: 110 },
    { id: 'htank',   name: 'Hydrolox Tank',    dry: 1800, fuel: 6000,  cost: 900, propellant: 'hydrolox', h: 90 },
    { id: 'mtank',   name: 'Methalox Tank',    dry: 2600, fuel: 15000, cost: 850, propellant: 'methalox', h: 120 }
  ]
};

const GROUP_LABELS = {
  capsule: 'Capsules & Payload',
  engine: 'Engines',
  nozzle: 'Nozzles',
  tank: 'Fuel Tanks'
};

const GROUP_ORDER = ['capsule', 'engine', 'nozzle', 'tank'];

/* ---------------- State ---------------- */
/* stack: array of { category, data }, ordered bottom(0) -> top(last) */
let stack = [];

/* ---------------- Palette rendering ---------------- */
function fuelDot(fuel) {
  if (!fuel) return '';
  return `<span class="partcard__fuel fuel--${fuel}"></span>`;
}

function renderPalette() {
  const root = document.getElementById('paletteGroups');
  root.innerHTML = '';
  GROUP_ORDER.forEach(cat => {
    const wrap = document.createElement('div');
    wrap.className = 'partgroup';
    const label = document.createElement('div');
    label.className = 'partgroup__label';
    label.textContent = GROUP_LABELS[cat];
    wrap.appendChild(label);

    PARTS[cat].forEach(part => {
      const card = document.createElement('div');
      card.className = 'partcard';
      card.title = part.desc || '';
      let spec = '';
      if (cat === 'capsule') spec = `${part.mass.toLocaleString()} kg · $${part.cost}`;
      if (cat === 'engine') spec = `${part.thrust} kN · Isp ${part.isp}s · $${part.cost}`;
      if (cat === 'nozzle') spec = `Isp x${part.ispMult.toFixed(2)} · $${part.cost}`;
      if (cat === 'tank') spec = `${part.fuel.toLocaleString()} kg fuel · $${part.cost}`;

      card.innerHTML = `
        <div class="partcard__name">${fuelDot(part.fuel || part.propellant)}${part.name}</div>
        <div class="partcard__spec">${spec}</div>`;
      card.addEventListener('click', () => addPart(cat, part));
      wrap.appendChild(card);
    });
    root.appendChild(wrap);
  });
}

/* ---------------- Stack mutation ---------------- */
function addPart(category, data) {
  stack.push({ category, data });
  update();
}
function removeAt(index) {
  stack.splice(index, 1);
  update();
}
function removeTop() {
  stack.pop();
  update();
}
function clearAll() {
  stack = [];
  update();
}

/* ---------------- Stage parsing ---------------- */
function parseStages() {
  const stages = [];
  let current = null;
  let payloadMass = 0;
  let strayTankMass = 0;

  stack.forEach(item => {
    if (item.category === 'capsule') {
      payloadMass += item.data.mass;
    } else if (item.category === 'engine') {
      current = { engine: item.data, nozzle: null, tanks: [] };
      stages.push(current);
    } else if (item.category === 'nozzle') {
      if (current && !current.nozzle) current.nozzle = item.data;
    } else if (item.category === 'tank') {
      if (current) current.tanks.push(item.data);
      else strayTankMass += (item.data.dry + item.data.fuel);
    }
  });

  return { stages, payloadMass, strayTankMass };
}

/* ---------------- Physics-lite computation ---------------- */
function computeStats() {
  const { stages, payloadMass, strayTankMass } = parseStages();
  const warnings = [];

  if (strayTankMass > 0) {
    warnings.push('Fuel tank placed with no engine below it — counted as dead weight.');
  }

  const stageCalc = stages.map(st => {
    const fuelMismatch = st.tanks.some(t => t.propellant !== st.engine.fuel);
    if (fuelMismatch) warnings.push(`${st.engine.name} is burning the wrong propellant — output cut 40%.`);
    const efficiency = fuelMismatch ? 0.6 : 1.0;

    const nozzleIspMult = st.nozzle ? st.nozzle.ispMult : 0.75;
    const nozzleThrustMult = st.nozzle ? st.nozzle.thrustMult : 0.9;
    if (!st.nozzle) warnings.push(`${st.engine.name} has no nozzle attached — losing efficiency.`);

    const tanksDry = st.tanks.reduce((s, t) => s + t.dry, 0);
    const tanksFuel = st.tanks.reduce((s, t) => s + t.fuel, 0);
    const nozzleMass = st.nozzle ? st.nozzle.mass : 0;

    const dryMass = st.engine.mass + nozzleMass + tanksDry;
    const wetMass = dryMass + tanksFuel;

    const ispEff = st.engine.isp * nozzleIspMult * efficiency;
    const thrustEff = st.engine.thrust * nozzleThrustMult * efficiency;
    const cost = st.engine.cost + (st.nozzle ? st.nozzle.cost : 0) + st.tanks.reduce((s, t) => s + t.cost, 0);
    const height = st.engine.h + (st.nozzle ? st.nozzle.h : 0) + st.tanks.reduce((s, t) => s + t.h, 0);

    if (tanksFuel === 0) warnings.push(`${st.engine.name} has no fuel tank — it's dead weight.`);

    return { dryMass, wetMass, ispEff, thrustEff, cost, height, hasFuel: tanksFuel > 0 };
  });

  // total wet mass (bottom to top): payload + all stage wet masses
  const totalWetMass = payloadMass + strayTankMass + stageCalc.reduce((s, c) => s + c.wetMass, 0);
  const totalCost = stageCalc.reduce((s, c) => s + c.cost, 0) +
    stack.filter(i => i.category === 'capsule').reduce((s, i) => s + i.data.cost, 0);
  const totalHeight = (stack.filter(i => i.category === 'capsule').reduce((s, i) => s + i.data.h, 0) +
    stageCalc.reduce((s, c) => s + c.height, 0)) / 20; // scale px-ish stat to meters

  // delta-v: sum from bottom stage (index 0, fires first) upward
  let deltaV = 0;
  const perStageDeltaV = [];
  for (let i = 0; i < stageCalc.length; i++) {
    let massAbove = payloadMass;
    for (let j = i + 1; j < stageCalc.length; j++) massAbove += stageCalc[j].wetMass;
    const c = stageCalc[i];
    let dv = 0;
    if (c.hasFuel && c.wetMass > c.dryMass) {
      dv = c.ispEff * G0 * Math.log((massAbove + c.wetMass) / (massAbove + c.dryMass));
    }
    perStageDeltaV.push(dv);
    deltaV += dv;
  }

  const liftoffThrustKN = stageCalc.length ? stageCalc[0].thrustEff : 0;
  const twr = totalWetMass > 0 ? (liftoffThrustKN * 1000) / (totalWetMass * G0) : 0;

  if (stageCalc.length === 0) warnings.push('Add at least one engine to begin your first stage.');

  return {
    stages: stageCalc, perStageDeltaV, payloadMass, totalWetMass, totalCost,
    totalHeight, deltaV, twr, liftoffThrustKN, warnings
  };
}

/* ---------------- Blueprint SVG rendering ---------------- */
function renderBlueprint(stats) {
  const svg = document.getElementById('rocketSvg');
  const empty = document.getElementById('blueprintEmpty');
  svg.innerHTML = '';

  if (stack.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const W = 420, baseY = 620;
  const cx = 150;
  let y = baseY;

  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');

  function rect(x, yTop, w, h, fill, stroke) {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', yTop);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', fill); r.setAttribute('stroke', stroke || '#6FD6E8');
    r.setAttribute('stroke-width', '1.2');
    return r;
  }
  function label(text, yMid) {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', cx + 60); t.setAttribute('y', yMid + 4);
    t.setAttribute('fill', '#82A2C6'); t.setAttribute('font-size', '11');
    t.setAttribute('font-family', 'IBM Plex Mono, monospace');
    t.textContent = text;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx + 40); line.setAttribute('y1', yMid);
    line.setAttribute('x2', cx + 56); line.setAttribute('y2', yMid);
    line.setAttribute('stroke', '#23456e');
    g.appendChild(line);
    g.appendChild(t);
  }

  const fuelColor = { kerolox: '#E8C24C', hydrolox: '#6FD6E8', methalox: '#F0793C' };

  stack.forEach(item => {
    const d = item.data;
    const h = d.h;
    const yTop = y - h;

    if (item.category === 'capsule') {
      const w = 60;
      const p = document.createElementNS(ns, 'polygon');
      const points = [
        [cx - w / 2, y], [cx - w / 2, yTop + 12], [cx, yTop], [cx + w / 2, yTop + 12], [cx + w / 2, y]
      ].map(p => p.join(',')).join(' ');
      p.setAttribute('points', points);
      p.setAttribute('fill', '#123055');
      p.setAttribute('stroke', '#EAF3FB');
      p.setAttribute('stroke-width', '1.4');
      g.appendChild(p);
      label(d.name, yTop + h / 2);
    } else if (item.category === 'tank') {
      const w = 80;
      g.appendChild(rect(cx - w / 2, yTop, w, h, 'rgba(111,214,232,0.08)', fuelColor[d.propellant] || '#6FD6E8'));
      label(`${d.name}`, yTop + h / 2);
    } else if (item.category === 'engine') {
      const w = 50;
      g.appendChild(rect(cx - w / 2, yTop, w, h, '#0F2340', '#F0793C'));
      label(d.name, yTop + h / 2);
    } else if (item.category === 'nozzle') {
      const wTop = 44, wBot = 66;
      const p = document.createElementNS(ns, 'polygon');
      const points = [
        [cx - wTop / 2, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, y], [cx - wBot / 2, y]
      ].map(p => p.join(',')).join(' ');
      p.setAttribute('points', points);
      p.setAttribute('fill', '#0A1930');
      p.setAttribute('stroke', '#F0793C');
      p.setAttribute('stroke-width', '1.2');
      g.appendChild(p);
      label(d.name, yTop + h / 2);
    }
    y = yTop;
  });

  // overall height dimension line
  const dimX = cx - 100;
  const dim = document.createElementNS(ns, 'g');
  [['line', { x1: dimX, y1: baseY, x2: dimX, y2: y, stroke: '#23456e' }],
   ['line', { x1: dimX - 5, y1: baseY, x2: dimX + 5, y2: baseY, stroke: '#23456e' }],
   ['line', { x1: dimX - 5, y1: y, x2: dimX + 5, y2: y, stroke: '#23456e' }]
  ].forEach(([tag, attrs]) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    dim.appendChild(el);
  });
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', dimX - 10); t.setAttribute('y', (baseY + y) / 2);
  t.setAttribute('fill', '#6FD6E8'); t.setAttribute('font-size', '11');
  t.setAttribute('font-family', 'IBM Plex Mono, monospace');
  t.setAttribute('text-anchor', 'end');
  t.textContent = `${stats.totalHeight.toFixed(1)} m`;
  dim.appendChild(t);
  g.appendChild(dim);

  svg.setAttribute('viewBox', `0 0 420 ${baseY + 20}`);
  svg.appendChild(g);
}

/* ---------------- Stack list rendering ---------------- */
function renderStackList() {
  const root = document.getElementById('stackList');
  root.innerHTML = '';
  stack.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'stackitem';
    row.innerHTML = `<span>${i + 1}. ${item.data.name}</span>`;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', () => removeAt(i));
    row.appendChild(btn);
    root.appendChild(row);
  });
}

/* ---------------- Stats panel rendering ---------------- */
function renderStats(stats) {
  document.getElementById('statHeight').textContent = `${stats.totalHeight.toFixed(1)} m`;
  document.getElementById('statMass').textContent = `${Math.round(stats.totalWetMass).toLocaleString()} kg`;
  document.getElementById('statThrust').textContent = `${stats.liftoffThrustKN.toFixed(0)} kN`;
  document.getElementById('statTWR').textContent = stats.twr ? stats.twr.toFixed(2) : '—';
  document.getElementById('statDeltaV').textContent = `${Math.round(stats.deltaV).toLocaleString()} m/s`;
  document.getElementById('statStages').textContent = stats.stages.length;
  document.getElementById('statCost').textContent = `$${Math.round(stats.totalCost).toLocaleString()}`;
  document.getElementById('budgetReadout').innerHTML = `<span>BUDGET</span> $${Math.round(stats.totalCost).toLocaleString()}`;

  const twrEl = document.getElementById('statTWR');
  twrEl.style.color = stats.twr >= 1 ? '#6FD6E8' : '#F0793C';

  const warnRoot = document.getElementById('warnings');
  warnRoot.innerHTML = '';
  stats.warnings.forEach(w => {
    const div = document.createElement('div');
    div.className = 'warning';
    div.textContent = w;
    warnRoot.appendChild(div);
  });

  const launchBtn = document.getElementById('launchBtn');
  launchBtn.disabled = stats.stages.length === 0;
}

/* ---------------- Main update loop ---------------- */
function update() {
  const stats = computeStats();
  renderBlueprint(stats);
  renderStackList();
  renderStats(stats);
}

/* ---------------- Launch sequence ---------------- */
function classifyOutcome(stats) {
  if (stats.twr < 1) return { key: 'nolift', title: 'FAILURE TO LAUNCH', msg: 'Thrust-to-weight ratio below 1.0 — the vehicle never leaves the pad.' };
  const effectiveDv = Math.max(0, stats.deltaV - 1500); // gravity + drag loss estimate
  if (effectiveDv >= 9400) return { key: 'orbit', title: 'ORBIT ACHIEVED', msg: `Effective Δv of ${Math.round(effectiveDv).toLocaleString()} m/s clears the ~9,400 m/s needed for stable low Earth orbit.` };
  if (effectiveDv >= 4000) return { key: 'suborbital', title: 'SUBORBITAL — NO ORBIT', msg: `Effective Δv of ${Math.round(effectiveDv).toLocaleString()} m/s gets the vehicle up and over, but it falls back before completing an orbit.` };
  return { key: 'lowarc', title: 'LOW ARC — DID NOT REACH SPACE', msg: `Only ${Math.round(effectiveDv).toLocaleString()} m/s of effective Δv. Add more stages or fuel.` };
}

function runLaunch() {
  const stats = computeStats();
  if (stats.stages.length === 0) return;
  const outcome = classifyOutcome(stats);

  const overlay = document.getElementById('launchOverlay');
  const canvas = document.getElementById('launchCanvas');
  const statusEl = document.getElementById('launchStatus');
  const closeBtn = document.getElementById('closeLaunchBtn');
  closeBtn.hidden = true;
  overlay.hidden = false;

  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.4
  }));

  let t = 0;
  let phase = 'countdown';
  let countdown = 3;
  let rocketY = 0;      // 0 = on pad, grows upward
  let liftFail = outcome.key === 'nolift';
  const flightSeconds = 6;
  let flightT = 0;

  let countdownTimer = setInterval(() => {
    countdown -= 1;
    if (countdown <= 0) {
      clearInterval(countdownTimer);
      phase = 'flight';
      statusEl.textContent = 'LIFTOFF';
    } else {
      statusEl.textContent = `T-${countdown}`;
    }
  }, 700);
  statusEl.textContent = `T-${countdown}`;

  function drawRocket(x, y, scale, flame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // body
    ctx.fillStyle = '#EAF3FB';
    ctx.strokeStyle = '#6FD6E8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(14, -30);
    ctx.lineTo(14, 40);
    ctx.lineTo(-14, 40);
    ctx.lineTo(-14, -30);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // fins
    ctx.fillStyle = '#F0793C';
    ctx.beginPath();
    ctx.moveTo(-14, 30); ctx.lineTo(-28, 48); ctx.lineTo(-14, 48); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 30); ctx.lineTo(28, 48); ctx.lineTo(14, 48); ctx.closePath(); ctx.fill();
    if (flame) {
      const flicker = 20 + Math.random() * 18;
      const grad = ctx.createLinearGradient(0, 40, 0, 40 + flicker);
      grad.addColorStop(0, '#F0793C');
      grad.addColorStop(1, 'rgba(240,121,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-10, 40); ctx.lineTo(10, 40); ctx.lineTo(0, 40 + flicker); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function frame() {
    t += 1;
    ctx.fillStyle = '#010812';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#EAF3FB';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.r, s.r));

    const groundY = canvas.height - 90;
    ctx.strokeStyle = '#23456e';
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();

    if (phase === 'countdown') {
      drawRocket(canvas.width / 2, groundY, 2, false);
    } else if (phase === 'flight') {
      flightT += 1 / 60;
      const progress = Math.min(1, flightT / flightSeconds);

      if (liftFail) {
        // shake in place, small flame, then fail
        const shake = Math.sin(t * 2) * (progress < 0.4 ? 4 : 0);
        drawRocket(canvas.width / 2 + shake, groundY, 2, progress < 0.4);
        if (progress >= 0.4 && phase !== 'done') {
          statusEl.textContent = outcome.title;
          phase = 'done';
          closeBtn.hidden = false;
        }
      } else {
        const eased = 1 - Math.pow(1 - progress, 2);
        const travel = eased * (canvas.height * 1.1);
        const scale = Math.max(0.4, 2 - eased * 1.3);
        const y = groundY - travel;
        drawRocket(canvas.width / 2, y, scale, true);

        if (progress < 1) {
          statusEl.textContent = `ALTITUDE ${(eased * 400).toFixed(0)} km · Δv burn in progress`;
        } else if (phase !== 'done') {
          statusEl.textContent = `${outcome.title}`;
          phase = 'done';
          closeBtn.hidden = false;
        }
      }
    }

    if (phase !== 'stopped') requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  closeBtn.onclick = () => {
    phase = 'stopped';
    window.removeEventListener('resize', resize);
    overlay.hidden = true;
  };
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderPalette();
  update();
  document.getElementById('removeTopBtn').addEventListener('click', removeTop);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  document.getElementById('launchBtn').addEventListener('click', runLaunch);
});
