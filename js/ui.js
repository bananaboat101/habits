import { STATUS_LABEL, todayStr, addDays } from './logic.js';
export function el(tag, attrs = {}, ...children) {
  const svg = ['svg', 'rect', 'line', 'path', 'g', 'text', 'title'].includes(tag);
  const node = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.setAttribute('class', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'text') node.textContent = v;
    else if (k in node && !svg && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
export const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function parts(day) {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d };
}
export function wdIdx(day) {
  const { y, m, d } = parts(day);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
export function dayLabel(day) {
  const { m, d } = parts(day);
  return `${WD[wdIdx(day)]}, ${MONTHS_SHORT[m - 1]} ${d}`;
}
export function relDayLabel(day, today = todayStr()) {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return dayLabel(day);
}
export function statusBadge(status) {
  if (!status) return null;
  return el('span', { class: `status s-${status}`, text: STATUS_LABEL[status] });
}
export function toast(msg) {
  const t = el('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
export function pressable(node, onTap, onLong) {
  let timer = null, long = false, sx = 0, sy = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  node.addEventListener('pointerdown', (e) => {
    long = false; sx = e.clientX; sy = e.clientY;
    if (onLong) timer = setTimeout(() => { timer = null; long = true; onLong(); }, 500);
  });
  node.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('pointerleave', cancel);
  node.addEventListener('contextmenu', (e) => e.preventDefault());
  node.addEventListener('click', (e) => {
    if (long) { long = false; e.preventDefault(); return; }
    onTap();
  });
}
export function pickerDialog(title, presets, current) {
  return new Promise((resolve) => {
    const close = (val) => { overlay.remove(); resolve(val); };
    const grid = el('div', { class: 'preset-grid' },
      ...presets.map((p) => el('button', {
        type: 'button', class: `btn preset${p.value === current ? ' on' : ''}`, text: p.label, onclick: () => close(p.label),
      })));
    const input = el('input', { class: 'num dlg-input free', type: 'text', inputmode: 'decimal', 'aria-label': 'Other value', autocomplete: 'off' });
    const ok = el('button', { type: 'submit', class: 'btn primary wide', text: 'Apply' });
    ok.style.display = 'none';
    input.addEventListener('focus', () => { ok.style.display = ''; });
    const form = el('form', { class: 'dialog picker', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) close(input.value); } },
      el('div', { class: 'dlg-title', text: title }), grid, input, ok);
    const overlay = el('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, form);
    document.body.append(overlay);
  });
}
export function numberDialog(title, initial, opts = {}) {
  return new Promise((resolve) => {
    const input = el('input', { class: 'num dlg-input', type: 'text', inputmode: 'decimal', value: initial, 'aria-label': title, autocomplete: 'off' });
    const close = (val) => { overlay.remove(); resolve(val); };
    const buttons = opts.reset
      ? el('div', { class: 'dlg-stack' },
        el('button', { type: 'submit', class: 'btn primary wide', text: 'Apply' }),
        el('button', { type: 'button', class: 'btn wide', text: opts.reset, onclick: () => close('0') }))
      : el('div', { class: 'dlg-buttons' },
        el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => close(null) }),
        el('button', { type: 'submit', class: 'btn primary', text: 'Apply' }));
    const form = el('form', { class: 'dialog', onsubmit: (e) => { e.preventDefault(); close(input.value); } },
      el('div', { class: 'dlg-title', text: title }),
      input,
      buttons);
    const overlay = el('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, form);
    document.body.append(overlay);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}
