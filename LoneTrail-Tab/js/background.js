/**
 * Background Module
 * - Light theme: terrain heightmap from multi-frequency value noise (fBm),
 *   contour lines extracted precisely with Marching Squares.
 * - Dark theme: random starfield.
 */

/** Heightmap sample spacing in px */
const GRID_CELL = 24;

/** Number of contour levels */
const CONTOUR_LEVELS = 7;

/** fBm parameters */
const OCTAVES = 4;
const LACUNARITY = 2.2;
const PERSISTENCE = 0.5;
const BASE_FREQUENCY = 1 / 200;

/** Endpoint matching tolerance when chaining segments (px) */
const CHAIN_TOLERANCE = 1.5;

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
 * Creates a terrain contour canvas: 3-4 anchor-defined height field
 * + procedural fBm noise, contours extracted with Marching Squares.
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
    ctx.lineWidth = 1.5;

    const seed = Math.floor(Math.random() * 0xFFFFFFFF);
    const anchors = generateAnchors(w, h);

    const cols = Math.ceil(w / GRID_CELL) + 1;
    const rows = Math.ceil(h / GRID_CELL) + 1;
    const heightmap = new Float32Array(cols * rows);

    // 1. Height field = anchor influence (peaks/valleys) + procedural fBm noise
    let minH = Infinity;
    let maxH = -Infinity;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const hVal = terrainHeight(i * GRID_CELL, j * GRID_CELL, anchors, seed);
            heightmap[j * cols + i] = hVal;
            if (hVal < minH) minH = hVal;
            if (hVal > maxH) maxH = hVal;
        }
    }
    if (maxH - minH < 1e-6) return canvas;

    // 2. Marching Squares isolines, stroked on Canvas 2D
    const strokeStyle = resolveGridLineColor();
    for (let levelIdx = 0; levelIdx < CONTOUR_LEVELS; levelIdx++) {
        const level = minH + (levelIdx * (maxH - minH)) / (CONTOUR_LEVELS - 1);
        const segments = marchingSquares(heightmap, cols, rows, level);
        const polylines = chainSegments(segments, CHAIN_TOLERANCE);

        ctx.globalAlpha = Math.min(1, 0.45 + levelIdx * 0.08);
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        polylines.forEach((points) => {
            points.forEach((p, idx) => {
                if (idx > 0 && Math.hypot(p[0] - points[idx - 1][0], p[1] - points[idx - 1][1]) < 0.1) return;
                if (idx === 0) ctx.moveTo(p[0], p[1]);
                else ctx.lineTo(p[0], p[1]);
            });
        });
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    return canvas;
}

/** Generates 3-4 random anchor points (peaks/valleys) across the screen */
function generateAnchors(w, h) {
    const count = 3 + (Math.random() < 0.5 ? 1 : 0);
    const anchors = [];
    for (let i = 0; i < count; i++) {
        anchors.push({
            x: w * (0.12 + Math.random() * 0.76),
            y: h * (0.12 + Math.random() * 0.76),
            strength: (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.45),
            sigma: 140 + Math.random() * 140,
        });
    }
    return anchors;
}

/**
 * Height at a point: sum of anchor gaussian fields + procedural fBm detail
 */
function terrainHeight(x, y, anchors, seed) {
    let h = 0;
    for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];
        const dx = x - a.x;
        const dy = y - a.y;
        h += a.strength * Math.exp(-(dx * dx + dy * dy) / (2 * a.sigma * a.sigma));
    }
    h += fbmValueNoise(x, y, seed) * 0.35;
    return h;
}

/** Resolves the CSS --grid-line color for canvas strokes */
function resolveGridLineColor() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
    const m = raw.match(/rgba?\(([^)]+)\)/);
    if (m) {
        const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 3) {
            const alpha = parts.length === 4 ? parts[3] : 1;
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
        }
    }
    return 'rgba(0, 0, 0, 0.05)';
}

/**
 * fBm: sum of value-noise octaves, normalized to [0, 1]
 * @param {number} x - world x (px)
 * @param {number} y - world y (px)
 * @param {number} seed - per-render random seed
 */
function fbmValueNoise(x, y, seed) {
    let total = 0;
    let amplitude = 1;
    let maxValue = 0;
    let frequency = BASE_FREQUENCY;

    for (let octave = 0; octave < OCTAVES; octave++) {
        total += valueNoise(x * frequency, y * frequency, seed) * amplitude;
        maxValue += amplitude;
        amplitude *= PERSISTENCE;
        frequency *= LACUNARITY;
    }

    return total / maxValue;
}

/**
 * Value noise: bilinear + smoothstep interpolation over a hashed lattice
 */
function valueNoise(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smoothstep(x - x0);
    const fy = smoothstep(y - y0);

    const v00 = hashNoise(x0, y0, seed);
    const v10 = hashNoise(x0 + 1, y0, seed);
    const v01 = hashNoise(x0, y0 + 1, seed);
    const v11 = hashNoise(x0 + 1, y0 + 1, seed);

    const a = v00 + (v10 - v00) * fx;
    const b = v01 + (v11 - v01) * fx;
    return a + (b - a) * fy;
}

/** Smoothstep easing for lattice interpolation */
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

/**
 * Deterministic pseudo-random value in [0, 1] for a lattice point.
 * Same (x, y, seed) always yields the same value.
 */
function hashNoise(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + (seed | 0);
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
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
 * Chains line segments into polylines by matching endpoints
 * @returns {Array<Array<[number, number]>>}
 */
function chainSegments(segments, tolerance) {
    const lines = [];
    const used = new Array(segments.length).fill(false);
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        const poly = [segments[i][0], segments[i][1]];

        let grew = true;
        while (grew) {
            grew = false;
            for (let j = 0; j < segments.length; j++) {
                if (used[j]) continue;
                const a = segments[j][0];
                const b = segments[j][1];
                if (dist(a, poly[0]) <= tolerance) {
                    poly.unshift(b);
                    used[j] = true;
                    grew = true;
                } else if (dist(b, poly[0]) <= tolerance) {
                    poly.unshift(a);
                    used[j] = true;
                    grew = true;
                } else if (dist(a, poly[poly.length - 1]) <= tolerance) {
                    poly.push(b);
                    used[j] = true;
                    grew = true;
                } else if (dist(b, poly[poly.length - 1]) <= tolerance) {
                    poly.push(a);
                    used[j] = true;
                    grew = true;
                }
            }
        }

        lines.push(poly);
    }

    return lines;
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
