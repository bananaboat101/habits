import { init, subscribe } from './state.js';
import { renderToday, resetToToday } from './today.js';
import { renderStats, showMonth } from './stats.js';
import { renderSettings } from './settings.js';
import { setAppVersion, maybeAskBackup } from './backup.js';
import { todayStr } from './logic.js';
import { el } from './ui.js';
export const APP_VERSION = '3.0.1';
const main = document.getElementById('main');
const tabs = [...document.querySelectorAll('.topnav button')];
const info = { version: APP_VERSION, persisted: null };
setAppVersion(APP_VERSION);
let tab = 'now';
function render() {
  for (const b of tabs) {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  }
  if (tab === 'now') renderToday(main);
  else if (tab === 'history') renderStats(main);
  else renderSettings(main, info);
  updateScroll();
}
function updateScroll() {
  const root = document.documentElement;
  root.classList.remove('noscroll');
  if (tab === 'settings') return;
  const last = main.lastElementChild;
  const bottom = last ? last.getBoundingClientRect().bottom + window.scrollY : 0;
  if (bottom <= window.innerHeight) { window.scrollTo(0, 0); root.classList.add('noscroll'); }
}
new MutationObserver(() => updateScroll()).observe(main, { childList: true });
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (tab !== 'settings') render(); }, 150);
});
function select(t) {
  if (t === 'now') resetToToday();
  tab = t;
  if (location.hash !== `#${t}`) history.replaceState(null, '', `#${t}`);
  window.scrollTo(0, 0);
  render();
}
for (const b of tabs) b.addEventListener('click', () => select(b.dataset.tab));
const ORDER = ['now', 'history'];
let swipe = null;
document.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  const blocked = !ORDER.includes(tab) || e.touches.length > 1 || document.querySelector('.overlay') || e.target.closest('input, textarea, select');
  swipe = blocked ? null : { x: t.clientX, y: t.clientY, at: Date.now() };
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  const quick = Date.now() - swipe.at < 800;
  swipe = null;
  if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const i = ORDER.indexOf(tab) + (dx < 0 ? 1 : -1);
  if (i >= 0 && i < ORDER.length) select(ORDER[i]);
}, { passive: true });
async function start() {
  const h = location.hash.slice(1);
  if (h === 'month') { tab = 'history'; showMonth(); } else if (['now', 'history', 'settings'].includes(h)) tab = h;
  try {
    await init();
  } catch (err) {
    main.replaceChildren(el('p', { class: 'hint', text: `Could not open storage: ${err.message}` }));
    return;
  }
  subscribe(() => { if (tab !== 'now') render(); });
  render();
  maybeAskBackup();
  if (navigator.storage && navigator.storage.persist) {
    try { info.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch {  }
  }
  let day = todayStr();
  const check = () => {
    const now = todayStr();
    if (now !== day) { day = now; if (tab === 'now') resetToToday(); render(); }
    maybeAskBackup();
  };
  setInterval(check, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    const offer = (w) => {
      const bar = el('div', { class: 'update-bar', role: 'status' },
        el('span', { text: 'New version available.' }),
        el('button', { class: 'btn primary', text: 'Reload', onclick: () => w.postMessage('skipWaiting') }));
      document.body.append(bar);
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
}
start();
