import { todayStr, addDays, weekdayIdx } from './logic.js';
import { t } from './i18n.js';
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
export const weekdays = () => t('weekdays');
export const months = () => t('months');
export const monthsShort = () => t('monthsShort');
export function parts(day) {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d };
}
export function dayLabel(day) {
  const { m, d } = parts(day);
  return t('dayLabel', weekdays()[weekdayIdx(day)], m, d);
}
export function relDayLabel(day, today = todayStr()) {
  if (day === today) return t('today');
  if (day === addDays(today, -1)) return t('yesterday');
  return dayLabel(day);
}
export function toast(msg) {
  for (const old of document.querySelectorAll('.toast')) old.remove();
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
    const input = el('input', { class: 'num dlg-input free', type: 'text', inputmode: 'decimal', 'aria-label': t('otherValue'), autocomplete: 'off' });
    const ok = el('button', { type: 'submit', class: 'btn primary wide', text: t('apply') });
    ok.style.display = 'none';
    input.addEventListener('focus', () => { ok.style.display = ''; });
    const form = el('form', { class: 'dialog picker', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) close(input.value); } },
      el('div', { class: 'dlg-title', text: title }), grid, input, ok);
    const overlay = el('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, form);
    document.body.append(overlay);
  });
}
export function numberDialog(title, initial) {
  return new Promise((resolve) => {
    const input = el('input', { class: 'num dlg-input', type: 'text', inputmode: 'decimal', value: initial, 'aria-label': title, autocomplete: 'off' });
    const close = (val) => { overlay.remove(); resolve(val); };
    const buttons = el('div', { class: 'dlg-buttons' },
      el('button', { type: 'button', class: 'btn', text: t('cancel'), onclick: () => close(null) }),
      el('button', { type: 'submit', class: 'btn primary', text: t('apply') }));
    const form = el('form', { class: 'dialog', onsubmit: (e) => { e.preventDefault(); close(input.value); } },
      el('div', { class: 'dlg-title', text: title }),
      input,
      buttons);
    const overlay = el('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, form);
    document.body.append(overlay);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}
