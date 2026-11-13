import * as L from './logic.js';
import { state, habit, tileColor } from './state.js';
import { el, MONTHS } from './ui.js';
export function summary(slot, h) {
  const dot = (v) => L.fmtVal(slot, v);
  const t = h.target === null ? '' : ` | ${slot === 'h1' ? L.fmtH(h.target, true) : h.target}`;
  if (h.kind === 'avg') return `${h.value === null ? '–' : `Ø ${dot(Math.round(h.value))}`}${t}`;
  return `${h.value}${t}`;
}
export function monthTile(y, m, today, { mark = null, onPick = null, quiet = false } = {}) {
  const range = L.rangeFor('M', 0, `${y}-${String(m).padStart(2, '0')}-01`);
  const rows = L.SLOTS.map((slot) => {
    const hb = habit(slot);
    const h = L.headline(state.map, state.settings, slot, range, today);
    const strip = L.monthStrip(state.map, state.settings, slot, y, m, today);
    const stripEl = el('div', { class: `tile-strip${onPick ? ' pick' : ''}` },
      ...strip.map((c) => el('span', { class: `cell c-${c.status}${c.day === mark ? ' mark' : ''}` })));
    if (onPick) {
      stripEl.addEventListener('click', (e) => {
        const r = stripEl.getBoundingClientRect();
        const i = Math.min(strip.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * strip.length)));
        onPick(strip[i].day);
      });
    }
    const rowEl = el('div', { class: 'tile-row', 'aria-label': `${hb.shortName}: ${summary(slot, h)}` },
      el('div', { class: 'tile-head' },
        el('span', { class: 'tile-short', text: hb.shortName }),
        el('span', { class: 'tile-num', text: summary(slot, h) })),
      stripEl);
    rowEl.style.background = tileColor(slot);
    return rowEl;
  });
  return el('section', { class: `card tile${quiet ? ' quiet' : ''}`, 'aria-label': 'Month overview' },
    el('div', { class: 'tile-month', text: `${MONTHS[m - 1].toUpperCase()}${y !== Number(today.slice(0, 4)) ? ` ${y}` : ''}` }), ...rows);
}
