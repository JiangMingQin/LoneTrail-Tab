/**
 * Lightweight action toast: a dark bar revealed from the center outward,
 * used to confirm Apply / Reset in the settings modal.
 */

import { t } from '../i18n.js';

const DEFAULT_DURATION = 1800;
const BLINK_MS = 100;

let toastEl = null;
let textEl = null;
let hideTimer = null;
let removeTimer = null;

function ensureElements() {
    if (toastEl) return true;
    toastEl = document.getElementById('action-toast');
    textEl = toastEl?.querySelector('.toast-text');
    return Boolean(toastEl && textEl);
}

/** Shows a localized toast. Repeated calls restart the reveal. */
export function showToast(messageKey, duration = DEFAULT_DURATION) {
    if (!ensureElements()) return;

    clearTimeout(hideTimer);
    clearTimeout(removeTimer);
    textEl.textContent = t(messageKey);

    // Restart transitions even if the toast is already visible.
    toastEl.classList.remove('is-visible', 'is-blinking');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-visible');

    // 先闪烁，闪完再收起；消失是方波隐去而非平滑收回
    hideTimer = setTimeout(() => toastEl.classList.add('is-blinking'), duration);
    removeTimer = setTimeout(() => {
        toastEl.classList.remove('is-visible', 'is-blinking');
    }, duration + BLINK_MS);
}
