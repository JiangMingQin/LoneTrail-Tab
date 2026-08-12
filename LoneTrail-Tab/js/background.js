/**
 * Background Module
 * - Light theme: topographic contour map. Height field = reference-style
 *   multi-frequency sines + 3-4 random anchor hills (min-distance, may sit
 *   slightly off-screen); contours extracted with Marching Squares and
 *   stroked segment-by-segment on Canvas 2D.
 * - Dark theme: random starfield.
 */

/** Heightmap sample spacing in px */
const GRID_CELL = 16;

/** Number of contour levels */
const CONTOUR_LEVELS = 12;

/** Anchor parameters */
const ANCHOR_MIN = 3;
const ANCHOR_MAX = 4;
const ANCHOR_MIN_DIST_RATIO = 0.28;   // min(w, h) * ratio
const ANCHOR_OFFSCREEN = 0.10;        // allow 10% outside the screen
const ANCHOR_SIGMA_MIN = 140;
const ANCHOR_SIGMA_MAX = 280;
const ANCHOR_PLACE_ATTEMPTS = 40;

/**
 * Initializes the background SVG according to the current theme
 */
export function initBackground() {
    const container = getContainer();
    const { innerWidth: w, innerHeight: h } = window;
    const theme = document.documentElement.getAttribute('data-theme');

    let bgElement;
    if (theme === 'dark') {
        bgElement = createStarSvg(w, h);
    } else {
        bgElement = createTerrainCanvas(w, h);
    }

    mountBackground(bgElement, container);
}

/**
 * Creates the terrain contour canvas (light theme)
 * @param {number} w - Viewport width
 * @param {number} h - Viewport height
 */
function createTerrainCanvas(w, h) {
    const canvas = createCanvasElement();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 1.0;

    const seed = Math.floor(Math.random() * 0xFFFFFFFF);
    const anchors = generateAnchors(w, h);
    const phases = phaseOffsets(seed);

    const cols = Math.ceil(w / GRID_CELL) + 1;
    const rows = Math.ceil(h / GRID_CELL) + 1;
    const heightmap = new Float32Array(cols * rows);

    // 1. Height field: reference-style sines + anchor hills + edge falloff
    let minH = Infinity;
    let maxH = -Infinity;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const hVal = terrainHeight(i * GRID_CELL, j * GRID_CELL, w, h, anchors, phases);
            heightmap[j * cols + i] = hVal;
            if (hVal < minH) minH = hVal;
            if (hVal > maxH) maxH = hVal;
        }
    }
    if (maxH - minH < 1e-6) return canvas;

    // 2. Marching Squares isolines, stroked segment-by-segment (reference style)
    const strokeStyle = resolveContourColor();
    for (let levelIdx = 0; levelIdx < CONTOUR_LEVELS; levelIdx++) {
        const level = minH + ((levelIdx + 0.5) / CONTOUR_LEVELS) * (maxH - minH);
        const segments = marchingSquares(heightmap, cols, rows, level);

        ctx.globalAlpha = Math.min(1, 0.6 + levelIdx * 0.035);
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        for (const seg of segments) {
            ctx.moveTo(seg[0][0], seg[0][1]);
            ctx.lineTo(seg[1][0], seg[1][1]);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    return canvas;
}

/**
 * Generates 3-4 random anchors. Anchors are placed with a minimum
 * distance from each other and may sit slightly off-screen.
 */
function generateAnchors(w, h) {
    const count = ANCHOR_MIN + (Math.random() < 0.5 ? 1 : 0);
    const minDist = Math.min(w, h) * ANCHOR_MIN_DIST_RATIO;
    const lo = -ANCHOR_OFFSCREEN;
    const hi = 1 + ANCHOR_OFFSCREEN;
    const anchors = [];

    for (let i = 0; i < count; i++) {
        let placed = false;
        for (let attempt = 0; attempt < ANCHOR_PLACE_ATTEMPTS; attempt++) {
            const candidate = {
                x: w * (lo + Math.random() * (hi - lo)),
                y: h * (lo + Math.random() * (hi - lo)),
                strength: (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.45),
                sigma: ANCHOR_SIGMA_MIN + Math.random() * (ANCHOR_SIGMA_MAX - ANCHOR_SIGMA_MIN),
            };
            const ok = anchors.every((a) => (
                Math.hypot(a.x - candidate.x, a.y - candidate.y) >= minDist
            ));
            if (ok) {
                anchors.push(candidate);
                placed = true;
                break;
            }
        }

        if (!placed) {
            // Fallback: even angles on a circle around the screen center
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            anchors.push({
                x: w / 2 + Math.cos(angle) * minDist * 1.3,
                y: h / 2 + Math.sin(angle) * minDist * 1.3,
                strength: (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.45),
                sigma: ANCHOR_SIGMA_MIN + Math.random() * (ANCHOR_SIGMA_MAX - ANCHOR_SIGMA_MIN),
            });
        }
    }

    return anchors;
}

/**
 * Height at a point: multi-frequency sines (reference-style, seeded phases)
 * + anchor gaussian hills, scaled by a soft edge falloff.
 */
function terrainHeight(x, y, w, h, anchors, phases) {
    const u = ((x / w) * 2 - 1) * 5;
    const v = ((y / h) * 2 - 1) * 5;

    const h1 = Math.sin(u * 0.35 + phases[0]) * Math.cos(v * 0.40 + phases[1]) * 0.6;
    const h2 = Math.sin(u * 0.70 + v * 0.55 + phases[2]) * 0.4;
    const h3 = Math.cos(u * 0.25 - v * 0.65 + phases[3]) * 0.5;
    const h4 = Math.sin((u + v) * 1.2 + phases[4]) * 0.2;
    let height = h1 + h2 + h3 + h4;

    for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];
        const dx = x - a.x;
        const dy = y - a.y;
        height += a.strength * Math.exp(-(dx * dx + dy * dy) / (2 * a.sigma * a.sigma));
    }

    const dist = Math.sqrt(u * u + v * v);
    const edge = Math.max(0, 1 - ((dist / 5) ** 2) * 0.25);
    return height * edge;
}

/** Seeded PRNG (mulberry32) */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Draws 5 seeded phase offsets (radians) for the sine base */
function phaseOffsets(seed) {
    const rand = mulberry32(seed);
    const phases = [];
    for (let i = 0; i < 5; i++) {
        phases.push(rand() * Math.PI * 2);
    }
    return phases;
}

/** Resolves the CSS --text-sub color for canvas contour strokes */
function resolveContourColor() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--text-sub').trim();
    const hex = raw.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
    if (hex) {
        let value = hex[1];
        if (value.length === 3) value = value.split('').map((c) => c + c).join('');
        return `#${value}`;
    }
    const rgba = raw.match(/rgba?\(([^)]+)\)/);
    if (rgba) {
        const parts = rgba[1].split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 3) {
            const alpha = parts.length === 4 ? parts[3] : 1;
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
        }
    }
    return '#666666';
}

/**
 * Marching Squares: extract level-set segments from a heightmap grid.
 * Corners per cell: A bottom-left, B bottom-right, C top-right, D top-left.
 * Edge crossing points are linearly interpolated.
 * @returns {Array<Array<[number, number]>>} line segments
 */
function marchingSquares(heightmap, cols, rows, level) {
    const segments = [];

    for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
            const x0 = i * GRID_CELL;
            const y0 = j * GRID_CELL;
            const idx = j * cols + i;
            const hA = heightmap[idx];
            const hB = heightmap[idx + 1];
            const hC = heightmap[idx + cols + 1];
            const hD = heightmap[idx + cols];

            const bA = hA >= level ? 1 : 0;
            const bB = hB >= level ? 1 : 0;
            const bC = hC >= level ? 1 : 0;
            const bD = hD >= level ? 1 : 0;
            const caseIdx = bA | (bB << 1) | (bC << 2) | (bD << 3);

            if (caseIdx === 0 || caseIdx === 15) continue;

            const crossings = [];
            const addCrossing = (v0, v1, ex0, ey0, ex1, ey1) => {
                const t = (level - v0) / (v1 - v0);
                if (t <= 0.001 || t >= 0.999) return;
                crossings.push([
                    ex0 + (ex1 - ex0) * t,
                    ey0 + (ey1 - ey0) * t,
                ]);
            };

            // bottom A->B, right B->C, top C->D, left D->A
            if (bA !== bB) addCrossing(hA, hB, x0, y0, x0 + GRID_CELL, y0);
            if (bB !== bC) addCrossing(hB, hC, x0 + GRID_CELL, y0, x0 + GRID_CELL, y0 + GRID_CELL);
            if (bC !== bD) addCrossing(hC, hD, x0 + GRID_CELL, y0 + GRID_CELL, x0, y0 + GRID_CELL);
            if (bD !== bA) addCrossing(hD, hA, x0, y0 + GRID_CELL, x0, y0);

            if (crossings.length === 2) {
                segments.push([crossings[0], crossings[1]]);
            } else if (crossings.length === 4) {
                // Ambiguous diagonal cases: split by pairing adjacent edges
                if (caseIdx === 5) {
                    segments.push([crossings[0], crossings[3]], [crossings[1], crossings[2]]);
                } else {
                    segments.push([crossings[0], crossings[1]], [crossings[2], crossings[3]]);
                }
            }
        }
    }

    return segments;
}

/**
 * Creates a random starfield SVG for the dark night theme
 * @param {number} w - Viewport width
 * @param {number} h - Viewport height
 */
function createStarSvg(w, h) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = createSvgElement();
    const group = document.createElementNS(svgNS, 'g');

    // ~130 stars at 1920x1080
    const starCount = Math.round((w * h) / 16000);

    for (let i = 0; i < starCount; i++) {
        const cx = (Math.random() * w).toFixed(1);
        const cy = (Math.random() * h).toFixed(1);
        const radius = 0.4 + Math.random() * 1.2;

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', radius.toFixed(2));
        circle.setAttribute('opacity', (0.25 + Math.random() * 0.6).toFixed(2));
        circle.classList.add('bg-star');
        group.appendChild(circle);

        // Bright stars get a soft halo
        if (radius > 1.35) {
            const halo = document.createElementNS(svgNS, 'circle');
            halo.setAttribute('cx', cx);
            halo.setAttribute('cy', cy);
            halo.setAttribute('r', (radius * 2.6).toFixed(2));
            halo.setAttribute('opacity', '0.10');
            halo.classList.add('bg-star');
            group.appendChild(halo);
        }
    }

    svg.appendChild(group);
    return svg;
}

/** Gets or creates the background container */
function getContainer() {
    const container = document.getElementById('bg-layer');
    if (container) {
        container.innerHTML = '';
        return container;
    }
    return document.body;
}

/** Creates the base SVG element with default styles */
function createSvgElement() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.classList.add('bg-topography');

    // Fixed positioning behind content
    svg.style.position = 'fixed';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.zIndex = '-1';
    svg.style.pointerEvents = 'none';

    return svg;
}

/** Creates the base canvas element with default styles */
function createCanvasElement() {
    const canvas = document.createElement('canvas');
    canvas.classList.add('bg-topography');

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';

    return canvas;
}

/** Mounts the background element to DOM, handling container type */
function mountBackground(el, container) {
    if (container.id === 'bg-layer') {
        container.appendChild(el);
    } else {
        // Body fallback: remove existing and prepend
        const existing = document.querySelector('.bg-topography');
        if (existing) existing.remove();
        document.body.prepend(el);
    }
}
