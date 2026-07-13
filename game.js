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
// GAME DATA
// ========================================

const PART_CATALOG = {
    // Capsules & Payload
    'vostok': { name: 'Vostok Capsule', mass: 2460, cost: 500, height: 2.3, category: 'capsule', color: '#8a9ba8' },
    'soyuz': { name: 'Soyuz Descent Module', mass: 2900, cost: 650, height: 2.2, category: 'capsule', color: '#6d8a7d' },
    'orion': { name: 'Orion Crew Module', mass: 8900, cost: 1400, height: 3.3, category: 'capsule', color: '#c4b8a8' },
    'fairing': { name: 'Cargo Fairing', mass: 1700, cost: 350, height: 4.0, category: 'capsule', color: '#b8b0a0' },
    
    // Engines
    'rd107': { name: 'RD-107/108', mass: 1200, cost: 900, height: 2.8, category: 'engine', color: '#5a6a7a', thrust: 1000, isp: 320, fuel: 'kerolox' },
    'nk33': { name: 'NK-33', mass: 1400, cost: 1050, height: 3.0, category: 'engine', color: '#4a5a6a', thrust: 1638, isp: 331, fuel: 'kerolox' },
    'ssme': { name: 'SSME (RS-25)', mass: 3500, cost: 2200, height: 4.3, category: 'engine', color: '#6a7a8a', thrust: 2279, isp: 452, fuel: 'hydrolox' },
    'raptor': { name: 'Raptor 2', mass: 1600, cost: 1800, height: 3.1, category: 'engine', color: '#8a7a5a', thrust: 2300, isp: 380, fuel: 'methalox' },
};

const STACK = [];
let totalCost = 0;
let totalMass = 0;
let totalHeight = 0;
let totalThrust = 0;
let stageCount = 0;

// ========================================
// DOM REFERENCES
// ========================================

const paletteGroups = document.getElementById('paletteGroups');
const blueprint = document.getElementById('blueprint');
const rocketSvg = document.getElementById('rocketSvg');
const blueprintEmpty = document.getElementById('blueprintEmpty');
const stackList = document.getElementById('stackList');
const statHeight = document.getElementById('statHeight');
const statMass = document.getElementById('statMass');
const statThrust = document.getElementById('statThrust');
const statTWR = document.getElementById('statTWR');
const statDeltaV = document.getElementById('statDeltaV');
const statStages = document.getElementById('statStages');
const statCost = document.getElementById('statCost');
const budgetReadout = document.getElementById('budgetReadout');
const warnings = document.getElementById('warnings');
const launchBtn = document.getElementById('launchBtn');
const removeTopBtn = document.getElementById('removeTopBtn');
const clearBtn = document.getElementById('clearBtn');

// ========================================
// RENDER PALETTE
// ========================================

function renderPalette() {
    const categories = {
        'capsule': { label: 'Capsules & Payload', parts: [] },
        'engine': { label: 'Engines', parts: [] }
    };
    
    Object.entries(PART_CATALOG).forEach(([id, part]) => {
        if (categories[part.category]) {
            categories[part.category].parts.push({ id, ...part });
        }
    });
    
    let html = '';
    Object.values(categories).forEach(cat => {
        if (cat.parts.length === 0) return;
        html += `<div class="palette-group"><h3 class="palette-group__title">${cat.label}</h3>`;
        cat.parts.forEach(part => {
            let details = `${part.mass.toLocaleString()} kg · $${part.cost}`;
            if (part.thrust) details += ` · ${part.thrust} kN · Isp ${part.isp}s`;
            html += `
                <button class="part-btn" data-part-id="${part.id}">
                    <span class="part-btn__name">${part.name}</span>
                    <span class="part-btn__stats">${details}</span>
                </button>
            `;
        });
        html += '</div>';
    });
    paletteGroups.innerHTML = html;
    
    // Add click listeners to part buttons
    document.querySelectorAll('.part-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const partId = this.dataset.partId;
            addPart(partId);
        });
    });
}

// ========================================
// ADD PART
// ========================================

function addPart(partId) {
    // Start audio on first interaction
    startAudio();
    
    const part = PART_CATALOG[partId];
    if (!part) return;
    
    // Check if we have an engine (first part must be an engine)
    if (STACK.length === 0 && part.category !== 'engine') {
        showWarning('First part must be an engine!');
        return;
    }
    
    // Add to stack
    STACK.push(partId);
    updateStats();
    renderBlueprint();
    renderStackList();
    updateBudget();
    
    // Play sound
    playSound('part');
}

// ========================================
// REMOVE TOP
// ========================================

function removeTop() {
    if (STACK.length === 0) return;
    STACK.pop();
    updateStats();
    renderBlueprint();
    renderStackList();
    updateBudget();
    playSound('remove');
}

// ========================================
// CLEAR ALL
// ========================================

function clearAll() {
    if (STACK.length === 0) return;
    STACK.length = 0;
    updateStats();
    renderBlueprint();
    renderStackList();
    updateBudget();
    playSound('remove');
}

// ========================================
// UPDATE STATS
// ========================================

function updateStats() {
    totalMass = 0;
    totalHeight = 0;
    totalThrust = 0;
    totalCost = 0;
    stageCount = 0;
    let hasEngine = false;
    
    STACK.forEach(id => {
        const part = PART_CATALOG[id];
        totalMass += part.mass;
        totalHeight += part.height;
        totalCost += part.cost;
        if (part.thrust) {
            totalThrust += part.thrust;
            hasEngine = true;
            stageCount++;
        }
    });
    
    // Update display
    statHeight.textContent = totalHeight.toFixed(1) + ' m';
    statMass.textContent = totalMass.toLocaleString() + ' kg';
    statThrust.textContent = totalThrust.toLocaleString() + ' kN';
    statCost.textContent = '$' + totalCost.toLocaleString();
    statStages.textContent = stageCount;
    
    // Calculate TWR
    const weight = totalMass * 9.81 / 1000; // kN
    if (totalThrust > 0 && totalMass > 0) {
        const twr = (totalThrust / weight).toFixed(2);
        statTWR.textContent = twr;
    } else {
        statTWR.textContent = '—';
    }
    
    // Calculate Delta-V (simplified)
    if (totalThrust > 0 && totalMass > 0) {
        // Find the engine with highest Isp
        let maxIsp = 0;
        STACK.forEach(id => {
            const part = PART_CATALOG[id];
            if (part.isp && part.isp > maxIsp) maxIsp = part.isp;
        });
        if (maxIsp > 0) {
            const dv = maxIsp * 9.81 * Math.log(1 + (totalMass / 1000));
            statDeltaV.textContent = Math.round(dv) + ' m/s';
        } else {
            statDeltaV.textContent = '0 m/s';
        }
    } else {
        statDeltaV.textContent = '0 m/s';
    }
    
    // Check warnings
    let warningMsg = '';
    if (STACK.length > 0 && !hasEngine) {
        warningMsg = '⚠️ No engine detected!';
    } else if (totalThrust > 0 && totalMass > 0) {
        const twr = totalThrust / (totalMass * 9.81 / 1000);
        if (twr < 1.0) {
            warningMsg = `⚠️ Low TWR (${twr.toFixed(2)}) - Rocket may not lift off!`;
        } else if (twr < 1.2) {
            warningMsg = `⚠️ TWR ${twr.toFixed(2)} - Minimal thrust-to-weight ratio`;
        }
    }
    warnings.textContent = warningMsg;
}

// ========================================
// RENDER BLUEPRINT
// ========================================

function renderBlueprint() {
    if (STACK.length === 0) {
        blueprintEmpty.style.display = 'block';
        rocketSvg.innerHTML = '';
        return;
    }
    blueprintEmpty.style.display = 'none';
    
    const svgWidth = 420;
    const svgHeight = 640;
    const maxStackHeight = 580;
    const baseY = 620;
    const centerX = svgWidth / 2;
    
    let html = '';
    let currentY = baseY;
    const totalStackHeight = STACK.reduce((sum, id) => sum + PART_CATALOG[id].height, 0);
    const scale = Math.min(maxStackHeight / totalStackHeight, 1);
    
    STACK.forEach((id, index) => {
        const part = PART_CATALOG[id];
        const height = part.height * scale * 20;
        const width = 40 + (part.category === 'engine' ? 10 : 0);
        const x = centerX - width/2;
        const y = currentY - height;
        const isEngine = part.category === 'engine';
        
        // Body
        html += `<rect x="${x}" y="${y}" width="${width}" height="${height}" 
                      fill="${part.color}" stroke="#1a1a1a" stroke-width="1.5" rx="2"/>`;
        
        // Engine nozzle (if engine)
        if (isEngine) {
            const nozzleWidth = 30;
            const nozzleX = centerX - nozzleWidth/2;
            html += `<polygon points="${nozzleX},${currentY} ${centerX},${currentY + 10} ${centerX + nozzleWidth/2},${currentY}" 
                          fill="#3a3a3a" stroke="#1a1a1a" stroke-width="1"/>`;
        }
        
        // Capsule shape (if capsule)
        if (part.category === 'capsule' && index === STACK.length - 1) {
            // Nose cone
            html += `<polygon points="${centerX},${y - 8} ${centerX - width/2},${y} ${centerX + width/2},${y}" 
                          fill="${part.color}" stroke="#1a1a1a" stroke-width="1.5"/>`;
        }
        
        // Part label
        const label = part.name.length > 15 ? part.name.substring(0, 12) + '…' : part.name;
        html += `<text x="${centerX}" y="${y + height/2 + 4}" 
                      font-family="IBM Plex Mono, monospace" font-size="9" 
                      fill="#1a1a1a" text-anchor="middle" font-weight="500">${label}</text>`;
        
        currentY = y;
    });
    
    rocketSvg.innerHTML = html;
}

// ========================================
// RENDER STACK LIST
// ========================================

function renderStackList() {
    if (STACK.length === 0) {
        stackList.innerHTML = '<span style="color:#888; font-style:italic;">No parts stacked</span>';
        return;
    }
    
    let html = '';
    STACK.forEach((id, index) => {
        const part = PART_CATALOG[id];
        const num = STACK.length - index;
        html += `<div class="stack-item"><span class="stack-item__num">#${num}</span> ${part.name}</div>`;
    });
    stackList.innerHTML = html;
}

// ========================================
// UPDATE BUDGET
// ========================================

function updateBudget() {
    budgetReadout.innerHTML = `<span>BUDGET</span> $${totalCost.toLocaleString()}`;
}

// ========================================
// SHOW WARNING
// ========================================

function showWarning(msg) {
    warnings.textContent = '⚠️ ' + msg;
    playSound('error');
    setTimeout(() => {
        warnings.textContent = '';
    }, 3000);
}

// ========================================
// LAUNCH
// ========================================

function launch() {
    // Start audio
    startAudio();
    
    if (STACK.length === 0) {
        showWarning('Build a rocket first!');
        return;
    }
    
    // Check if rocket can launch
    let hasEngine = false;
    STACK.forEach(id => {
        if (PART_CATALOG[id].thrust) hasEngine = true;
    });
    
    if (!hasEngine) {
        showWarning('No engine on the rocket!');
        return;
    }
    
    // Calculate TWR
    const weight = totalMass * 9.81 / 1000;
    const twr = totalThrust / weight;
    
    if (twr < 1.0) {
        showWarning(`TWR ${twr.toFixed(2)} - Not enough thrust!`);
        playSound('error');
        return;
    }
    
    // Play launch sound
    playSound('launch');
    
    // Show launch overlay
    const overlay = document.getElementById('launchOverlay');
    overlay.hidden = false;
    const status = document.getElementById('launchStatus');
    
    // Simple countdown
    let count = 3;
    status.textContent = 'T-' + count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            status.textContent = 'T-' + count;
        } else if (count === 0) {
            status.textContent = '🚀 LIFTOFF!';
            playSound('success');
        } else {
            clearInterval(interval);
            const success = twr > 1.5 && Math.random() > 0.3;
            if (success) {
                status.textContent = '✅ SUCCESS! 🎉';
                playSound('success');
            } else {
                status.textContent = '💥 EXPLOSION!';
                playSound('explosion');
            }
            document.getElementById('closeLaunchBtn').hidden = false;
        }
    }, 1000);
}

// ========================================
// CLOSE LAUNCH OVERLAY
// ========================================

function closeLaunch() {
    document.getElementById('launchOverlay').hidden = true;
    document.getElementById('closeLaunchBtn').hidden = true;
    document.getElementById('launchStatus').textContent = 'T-3';
}

// ========================================
// INITIALIZE
// ========================================

function init() {
    // Initialize sound
    initSound();
    
    // Render UI
    renderPalette();
    updateStats();
    renderBlueprint();
    renderStackList();
    updateBudget();
    
    // Event listeners
    removeTopBtn.addEventListener('click', removeTop);
    clearBtn.addEventListener('click', clearAll);
    launchBtn.addEventListener('click', launch);
    document.getElementById('closeLaunchBtn').addEventListener('click', closeLaunch);
    
    console.log('🚀 STACK & LAUNCH ready!');
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
