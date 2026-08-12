import { state } from './state.js';

/** Number of points for irregular shape generation */
const NUM_POINTS = 16;

/** Opacity fade factor for inner rings (0-1) */
const OPACITY_FADE_FACTOR = 0.6;

/** Random gap factor range: 0.4x to 1.5x of base gap */
const GAP_RANDOM_MIN = 0.4;
const GAP_RANDOM_MAX = 1.5;

/** Background configuration for each corner group */
const BG_GROUPS = [
    { x: '0%', y: '0%', size: 900, count: 20, gap: 40 },   // Top-left
    { x: '100%', y: '100%', size: 1000, count: 22, gap: 45 }, // Bottom-right
];

/**
 * Initializes the topographic background SVG
 * Creates irregular concentric rings with non-uniform spacing
 * Rings share the same shape seed to prevent crossing
 */
export function initBackground() {
    const container = getContainer();
    const { innerWidth: w, innerHeight: h } = window;
    const theme = document.documentElement.getAttribute('data-theme');

    let svg;
    if (theme === 'dark') {
        svg = createStarSvg(w, h);
    } else {
        svg = createSvgElement();
        BG_GROUPS.forEach((config) => {
            const groupEl = createRingGroup(config, w, h);
            svg.appendChild(groupEl);
        });
    }

    mountSvg(svg, container);
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

/**
 * Creates a group of concentric irregular rings
 * @param {Object} config - Group configuration (size, count, gap)
 * @param {number} w - Viewport width
 * @param {number} h - Viewport height
 */
function createRingGroup(config, w, h) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const groupEl = document.createElementNS(svgNS, 'g');

    // Position group at corner (top-left or bottom-right)
    const transX = config.x === '100%' ? w : 0;
    const transY = config.y === '100%' ? h : 0;
    groupEl.setAttribute('transform', `translate(${transX}, ${transY})`);

    // Generate shape seeds once per group so all rings share the same "shape"
    // This guarantees concentric rings never cross each other
    const seedOffsets = generateShapeSeeds(NUM_POINTS);

    // Draw rings from outside in, with random spacing
    let currentRadius = config.size;

    for (let i = 0; i < config.count; i++) {
        if (currentRadius <= 0) break;

        const path = createRingPath(currentRadius, seedOffsets, i, config.count);
        groupEl.appendChild(path);

        // Random gap creates "tight" vs "wide" spacing effect
        const randomFactor = GAP_RANDOM_MIN + Math.random() * (GAP_RANDOM_MAX - GAP_RANDOM_MIN);
        currentRadius -= config.gap * randomFactor;
    }

    return groupEl;
}

/** Generates random offsets for irregular shape (0.85 - 1.15 range) */
function generateShapeSeeds(count) {
    const seeds = [];
    for (let i = 0; i < count; i++) {
        seeds.push(0.85 + Math.random() * 0.3);
    }
    return seeds;
}

/**
 * Creates a single ring path element
 * @param {number} radius - Ring radius
 * @param {number[]} seedOffsets - Shape seed offsets
 * @param {number} index - Ring index (for opacity calculation)
 * @param {number} total - Total ring count
 */
function createRingPath(radius, seedOffsets, index, total) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const pathData = generateIrregularPath(radius, seedOffsets);

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    path.classList.add('bg-line');

    // Inner rings fade out progressively
    path.style.opacity = 1 - (index / total) * OPACITY_FADE_FACTOR;

    return path;
}

/**
 * Generates path data for an irregular closed shape
 * Uses the seed offsets to vary radius at each point
 */
function generateIrregularPath(radius, offsets) {
    const points = [];
    const angleStep = (Math.PI * 2) / NUM_POINTS;

    for (let i = 0; i < NUM_POINTS; i++) {
        const angle = i * angleStep;
        const r = radius * offsets[i];
        points.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
        });
    }

    return pointsToBezierPath(points, true);
}

/**
 * Converts points to SVG path with Catmull-Rom spline smoothing
 * Uses cubic Bezier curves for smooth interpolation between points
 */
function pointsToBezierPath(points, close) {
    if (points.length < 2) return '';

    let d = '';
    const len = points.length;

    for (let i = 0; i < len; i++) {
        // Get current point and neighbors for tangent calculation
        const p0 = points[(i - 1 + len) % len]; // Previous
        const p1 = points[i];                   // Current
        const p2 = points[(i + 1) % len];       // Next
        const p3 = points[(i + 2) % len];       // After next

        // Control points: 1/6 of the chord length for smooth tangents
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        if (i === 0) d += `M ${p1.x},${p1.y} `;
        d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} `;
    }

    if (close) d += 'Z';
    return d;
}

/** Mounts SVG to DOM, handling container type */
function mountSvg(svg, container) {
    if (container.id === 'bg-layer') {
        container.appendChild(svg);
    } else {
        // Body fallback: remove existing and prepend
        const existing = document.querySelector('.bg-topography');
        if (existing) existing.remove();
        document.body.prepend(svg);
    }
}
