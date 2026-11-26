// Phosphor Icons — MIT © 2023 Phosphor Icons
// 来源: github.com/phosphor-icons/core/tree/main/assets/regular
// 只内联本项目实际用到的图标，避免引入字体或外部依赖。
const PATHS = {
    search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
    folder: 'M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z',
    x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
};

/** 返回内联 SVG 字符串；颜色始终走 currentColor，随主题与选中态反色。 */
export function icon(name, className = '') {
    const d = PATHS[name];
    return d
        ? `<svg class="ph-icon ${className}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`
        : '';
}
