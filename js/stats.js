import * as L from './logic.js';
import { state, habit, tileColor, setPrefs } from './state.js';
import { el, WD, MONTHS, MONTHS_SHORT, dayLabel, parts, pressable } from './ui.js';
const COLORS = { exceeded: '#3DA866', reached: '#F5F5F7', missed: '#D2554C', done: '#F5F5F7', skipped: '#48484A' };
const NEUTRAL = '#8E8E93';
const view = { mode: null, offset: 0, sel: {}, chartH: 100 };
export function showMonth() { view.mode = 'M'; view.offset = 0; view.sel = {}; }
export function renderStats(root, fitted = false) {
  if (!view.mode) view.mode = state.prefs.statsMode;
  const today = L.todayStr();
  const range = L.rangeFor(view.mode, view.offset, today);
  const prev = L.rangeFor(view.mode, view.offset - 1, today);
  const seg = el('div', { class: 'segmented', role: 'tablist' },
    ...['W', 'M', 'Y'].map((m) => el('button', {
      role: 'tab', 'aria-selected': String(view.mode === m), class: view.mode === m ? 'active' : '',
      'aria-label': { W: 'Week', M: 'Month', Y: 'Year' }[m], text: m,
      onclick: () => {
        view.mode = m; view.offset = 0; view.sel = {};
        renderStats(root);
        if (state.prefs.statsMode !== m) setPrefs({ statsMode: m });
      },
    })));
  const go = (d) => {
    if (view.offset + d > 0) return;
    view.offset += d; view.sel = {}; renderStats(root);
  };
  const dateMain = el('div', { class: 'date-main press', text: rangeTitle(range) });
  pressable(dateMain, () => {}, () => { if (view.offset !== 0) go(-view.offset); });
  const nav = el('div', { class: 'datebar' },
    el('button', { class: 'icon-btn', 'aria-label': 'Previous period', text: '‹', onclick: () => go(-1) }),
    dateMain,
    el('button', { class: 'icon-btn', 'aria-label': 'Next period', text: '›', disabled: view.offset >= 0, onclick: () => go(1) }));
  const content = el('div', { class: 'stats-content' },
    ...L.SLOTS.map((slot) => card(slot, range, prev, today, root)));
  root.replaceChildren(seg, nav, content);
  if (!fitted) fitCharts(root);
}
function bottomInset() {
  const probe = el('div', { 'aria-hidden': 'true' });
  Object.assign(probe.style, { position: 'fixed', visibility: 'hidden', height: 'env(safe-area-inset-bottom)' });
  document.body.append(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}
function fitCharts(root) {
  const svg = root.querySelector('.chart');
  const last = root.querySelector('.stats-content > :last-child');
  if (!svg || !last) return;
  const r = svg.getBoundingClientRect();
  if (!r.width) return;
  const spare = window.innerHeight - bottomInset() - 12 - (last.getBoundingClientRect().bottom + window.scrollY);
  const px = Math.max(80, Math.min(200, r.height + spare / 3));
  const H = Math.round((320 * px) / r.width);
  if (Math.abs(H - view.chartH) >= 2) { view.chartH = H; renderStats(root, true); }
}
function rangeTitle(r) {
  if (r.mode === 'W') {
    const a = parts(r.start), b = parts(r.end);
    if (a.y !== b.y) return `${MONTHS_SHORT[a.m - 1]} ${a.d}, ${a.y} – ${MONTHS_SHORT[b.m - 1]} ${b.d}, ${b.y}`;
    if (a.m !== b.m) return `${MONTHS_SHORT[a.m - 1]} ${a.d} – ${MONTHS_SHORT[b.m - 1]} ${b.d}, ${b.y}`;
    return `${MONTHS_SHORT[a.m - 1]} ${a.d}–${b.d}, ${b.y}`;
  }
  if (r.mode === 'M') return `${MONTHS[r.m - 1]} ${r.y}`;
  return String(r.y);
}
function diffText(amt, cur, prev) {
  const d = amt ? Math.round((cur - prev) / 10) * 10 : cur - prev;
  if (d === 0) return '±0';
  return (d > 0 ? '+' : '−') + (amt ? L.fmtH(Math.abs(d)) : String(Math.abs(d)));
}
function card(slot, range, prev, today, root) {
  const hb = habit(slot);
  const cfg = state.settings;
  const amt = slot === 'h1';
  const h = L.headline(state.map, cfg, slot, range, today);
  const hp = L.headline(state.map, cfg, slot, prev, today);
  const fmtValue = (v) => (amt ? (v === null ? '–' : `Ø ${L.fmtH(Math.round(v))}`) : String(v));
  const hasPrev = prev.end >= cfg.startDay && hp.value !== null && h.value !== null;
  const big = fmtValue(h.value);
  const bs = L.bars(state.map, cfg, slot, range, today);
  const sel = view.sel[slot];
  const selBar = bs.find((b) => b.key === sel);
  const side = selBar
    ? el('span', { class: 'bar-info num', 'aria-live': 'polite', text: barText(slot, selBar) })
    : (hasPrev ? el('span', { class: 'compare num', 'aria-label': 'Change from previous period', text: diffText(amt, h.value, hp.value) }) : null);
  const node = el('section', { class: 'card stat-card', 'aria-label': hb.shortName },
    el('div', { class: 'headline' },
      el('span', { class: 'habit-name', text: hb.shortName }),
      el('span', { class: 'big num', text: big }),
      side),
    chart(slot, bs, range, root));
  node.style.background = tileColor(slot);
  return node;
}
function barText(slot, b) {
  if (b.day && b.status === 'skipped') return `${dayLabel(b.day)}: not confirmed`;
  if (b.day) return `${dayLabel(b.day)}: ${slot === 'h1' ? L.fmtH(b.value) : (b.value ? '✓' : '✕')}`;
  if (b.avg) return `${MONTHS[b.month - 1]}: ${b.empty ? '–' : `Ø ${L.fmtH(Math.round(b.value))}`} per day`;
  return `${MONTHS[b.month - 1]}: ${b.value}`;
}
function barLabel(b, range, i) {
  if (b.day) {
    if (range.mode === 'W') return WD[i];
    const d = parts(b.day).d;
    return [1, 8, 15, 22, 29].includes(d) ? String(d) : '';
  }
  return MONTHS_SHORT[b.month - 1].slice(0, 1);
}
function chart(slot, bs, range, root) {
  const W = 320, H = view.chartH, top = 6, bottom = 16, plotH = H - top - bottom;
  const unit = slot === 'h1' ? 100 : 1;
  const maxV = Math.max(unit, ...bs.map((b) => b.value), ...bs.map((b) => b.target || 0)) * 1.15;
  const y = (v) => top + plotH - (v / maxV) * plotH;
  const n = bs.length, slotW = W / n, barW = Math.max(2, Math.min(28, slotW * 0.6));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Chart ${habit(slot).shortName}` });
  svg.append(el('line', { x1: 0, x2: W, y1: top + plotH + 0.5, y2: top + plotH + 0.5, stroke: '#2C2C2E', 'stroke-width': 1 }));
  bs.forEach((b, i) => {
    const cx = i * slotW + slotW / 2;
    const dim = view.sel[slot] && view.sel[slot] !== b.key ? 0.45 : 1;
    if (b.day && b.status === 'skipped') {
      svg.append(el('rect', {
        x: cx - barW / 2 + 0.5, y: top + 0.5, width: barW - 1, height: plotH - 1, rx: Math.min(2, barW / 3),
        fill: 'none', stroke: NEUTRAL, 'stroke-width': 1, 'stroke-dasharray': '2 2', class: 'skip-mark', opacity: dim,
      }));
    } else if (!b.future && !b.before && !(b.day && b.status === 'open')) {
      const color = COLORS[b.status] || NEUTRAL;
      const hgt = Math.max(1.5, (b.value / maxV) * plotH);
      svg.append(el('rect', { x: cx - barW / 2, y: top + plotH - hgt, width: barW, height: hgt, rx: Math.min(2, barW / 3), fill: color, opacity: dim }));
    }
    const lbl = barLabel(b, range, i);
    if (lbl) svg.append(el('text', { x: cx, y: H - 4, 'text-anchor': 'middle', class: 'axis-lbl', text: lbl }));
    const hit = el('rect', { x: i * slotW, y: 0, width: slotW, height: H, fill: 'transparent', class: 'hit' },
      el('title', { text: barText(slot, b) }));
    hit.addEventListener('click', () => { view.sel[slot] = view.sel[slot] === b.key ? undefined : b.key; renderStats(root); });
    svg.append(hit);
  });
  let d = '';
  bs.forEach((b, i) => {
    if (b.target === null || b.target === undefined || b.before) return;
    const ty = y(b.target).toFixed(1);
    const x0 = (i * slotW).toFixed(1), x1 = ((i + 1) * slotW).toFixed(1);
    d += d === '' ? `M${x0},${ty}H${x1}` : `V${ty}H${x1}`;
  });
  if (d) svg.insertBefore(el('path', { d, fill: 'none', stroke: NEUTRAL, 'stroke-width': 1, 'stroke-dasharray': '3 3', 'pointer-events': 'none' }), svg.querySelector('.hit'));
  return svg;
}
