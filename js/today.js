import * as L from './logic.js';
import { state, setDayValue, clearDayValue, habit, tileColor, isDayChecked, toggleCheck } from './state.js';
import { el, relDayLabel, pickerDialog, toast, pressable, parts } from './ui.js';
import { monthTile } from './tile.js';
let selected = null;
let popSlot = null;
let flash = null;
const FLASH_MS = 1800;
export function resetToToday() { selected = L.todayStr(); }
const PRESETS = Array.from({ length: 12 }, (_, i) => ({ value: i * 25, label: L.fmtH(i * 25, true) }));
async function amountDialog(day, rerender) {
  const hb = habit('h1');
  const cur = L.dayValue(state.map, 'h1', day);
  const txt = await pickerDialog(`${hb.shortName} – ${relDayLabel(day)}`, PRESETS, cur);
  if (txt === null) return;
  const v = L.parseH(txt);
  if (v === null || v > L.AMOUNT_MAX) { toast('Please enter a number from 0 to 99 with up to two decimals.'); return; }
  if (v === 0) popSlot = 'h1';
  if (await setDayValue('h1', day, v)) rerender();
}
function markEl(on) {
  return el('span', { class: `q-mark${on ? ' on' : ''}`, 'aria-hidden': 'true' },
    on ? el('svg', { viewBox: '0 0 24 24', class: 'q-check' },
      el('path', { d: 'M6 12.5l4 4 8-9', fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) : null);
}
export function renderToday(root) {
  const today = L.todayStr();
  if (!selected || selected > today) selected = today;
  const day = selected;
  const go = (d) => { if (d <= today) { selected = d; renderToday(root); } };
  const { y, m } = parts(day);
  const dateMain = el('div', { class: 'date-main press', text: relDayLabel(day, today) });
  pressable(dateMain, () => {}, () => go(today));
  const header = el('div', { class: 'datebar compact' },
    el('button', { class: 'icon-btn', 'aria-label': 'Previous day', text: '‹', onclick: () => go(L.addDays(day, -1)) }),
    el('div', { class: 'date-title' }, dateMain),
    el('button', { class: 'icon-btn', 'aria-label': 'Next day', text: '›', disabled: day >= today, onclick: () => go(L.addDays(day, 1)) }));
  const locked = isDayChecked(day);
  const quick = el('div', { class: `quick${locked ? ' locked' : ''}` }, ...L.SLOTS.map((slot) => quickTile(slot, day, locked, () => renderToday(root))));
  popSlot = null;
  const before = day < state.settings.startDay
    ? el('div', { class: 'day-note', text: 'Before the tracking start – this day does not count.' }) : null;
  const open = L.unconfirmedDays(state.map, state.settings, today);
  const missing = open > 0
    ? el('button', {
      class: 'missing-note', role: 'status',
      text: `${open} previous ${open === 1 ? 'day' : 'days'} unconfirmed`,
      onclick: () => go(L.firstUnconfirmedDay(state.map, state.settings, today)),
    }) : null;
  root.replaceChildren(...[
    monthTile(y, m, today, { mark: day, onPick: go, quiet: true }),
    missing, header, quick, before, lockBar(day, today, root),
  ].filter(Boolean));
}
function nudgeLock() {
  const b = document.querySelector('.lock-btn');
  if (!b) return;
  b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
}
function quickTile(slot, day, locked, rerender) {
  const hb = habit(slot);
  const dv = L.dayValue(state.map, slot, day);
  let btn;
  const tap = (fn) => () => (locked ? nudgeLock() : fn());
  const reset = async () => {
    if (locked) { nudgeLock(); return; }
    if (await clearDayValue(slot, day)) rerender();
  };
  const fresh = slot === 'h1' && !L.hasEntry(state.map, slot, day) && !isDayChecked(day);
  if (slot === 'h1' && !fresh) {
    const tone = dv < hb.lo ? 'good' : (dv > hb.hi ? 'bad' : 'ok');
    const n = Math.max(1, Math.min(13, Math.ceil(hb.hi / L.AMOUNT_STEP)));
    const segs = Math.min(n, Math.floor(dv / L.AMOUNT_STEP));
    btn = el('button', {
      class: `quick-tile amt ${tone}${dv === 0 ? ' zero' : ''}${popSlot === slot && dv === 0 ? ' pop' : ''}`,
      'aria-label': `${hb.shortName}: ${L.fmtH(dv, true)}.${locked ? ' Day confirmed.' : ' Tap: choose a value. Long press: reset.'}`, 'aria-disabled': String(locked),
    },
    el('span', { class: 'q-short', text: hb.shortName }),
    el('span', { class: 'q-val', text: L.fmtH(dv, true) }),
    el('span', { class: 'gauge', 'aria-hidden': 'true' }, ...Array.from({ length: n }, (_, i) => el('i', { class: i < segs ? 'on' : '' }))));
    pressable(btn, tap(() => amountDialog(day, rerender)), reset);
  } else if (fresh) {
    btn = el('button', {
      class: 'quick-tile amt-fresh', 'aria-disabled': String(locked),
      'aria-label': `${hb.shortName}: nothing entered yet.${locked ? '' : ' Tap: choose a value.'}`,
    }, el('span', { class: 'q-short', text: hb.shortName }), markEl(false));
    pressable(btn, tap(() => amountDialog(day, rerender)), reset);
  } else {
    btn = el('button', {
      class: `quick-tile toggle${dv ? ' on' : ''}${popSlot === slot && dv ? ' pop' : ''}`,
      'aria-pressed': String(!!dv), 'aria-label': `${hb.shortName} ${dv ? 'done' : 'not done'}`, 'aria-disabled': String(locked),
    }, el('span', { class: 'q-short', text: hb.shortName }), markEl(!!dv));
    pressable(btn, tap(async () => {
      const next = L.dayValue(state.map, slot, day) ? 0 : 1;
      if (next) popSlot = slot;
      if (await setDayValue(slot, day, next)) rerender();
    }), reset);
  }
  btn.style.background = tileColor(slot);
  return btn;
}
function lockIcon() {
  return el('svg', { viewBox: '0 0 24 24', class: 'lock-ico', 'aria-hidden': 'true' },
    el('path', { class: 'lock-shackle', d: 'M8 11V7.5a4 4 0 0 1 8 0V11' }),
    el('rect', { class: 'lock-body', x: 5, y: 11, width: 14, height: 10, rx: 2.5 }));
}
function lockBar(day, today, root) {
  const done = isDayChecked(day);
  const now = performance.now();
  const fl = flash && flash.day === day ? flash : null;
  let note = null;
  if (fl) {
    note = el('div', { class: 'lock-flash', role: 'status', text: fl.text });
    note.style.animationDelay = `-${now - fl.at}ms`;
  } else if (!done && day >= state.settings.startDay && day < today) {
    note = el('div', { class: 'check-note', text: 'Unconfirmed – this day doesn\'t count yet.' });
  }
  const btn = el('button', {
    class: `lock-btn${done ? ' locked' : ''}`, 'aria-pressed': String(done),
    'aria-label': done ? 'Day confirmed – tap to remove confirmation' : 'Confirm day',
    onclick: async () => {
      btn.classList.toggle('locked', !done);
      const f = { day, text: done ? 'Confirmation removed' : 'Day confirmed', at: performance.now() };
      flash = f;
      await toggleCheck(day);
      setTimeout(() => { if (root.contains(btn)) renderToday(root); }, 280);
      setTimeout(() => {
        if (flash !== f) return;
        flash = null;
        if (root.contains(document.querySelector('.lock-flash'))) renderToday(root);
      }, FLASH_MS + 50);
    },
  }, lockIcon());
  return el('div', { class: 'checkbar' }, btn, el('div', { class: 'lock-note' }, note));
}
