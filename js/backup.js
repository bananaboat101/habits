import * as L from './logic.js';
import { state, allDays, setPrefs } from './state.js';
import { buildExport, exportFileName } from './data.js';
import { el, toast } from './ui.js';
import { t, getLang } from './i18n.js';
let appVersion = '';
export function setAppVersion(v) { appVersion = v; }
export function useShareSheet() {
  return typeof navigator.share === 'function' && navigator.maxTouchPoints > 0;
}
export function makeFile() {
  const obj = buildExport({ days: allDays(), checks: state.checks.map((c) => c.day), settings: state.settings, prefs: state.prefs, language: getLang() },
    new Date().toISOString(), appVersion);
  return new File([JSON.stringify(obj, null, 1)], exportFileName(L.todayStr()), { type: 'application/json' });
}
export function download(file) {
  const url = URL.createObjectURL(file);
  const a = el('a', { href: url, download: file.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function shareBackup() {
  let file;
  try { file = makeFile(); } catch (err) { alert(t('exportFailed', err.message)); return; }
  if (useShareSheet() && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    navigator.share({ files: [file] }).catch((e) => {
      if (e && e.name === 'AbortError') return;
      download(file);
    });
    return;
  }
  download(file);
  toast(t('saving', file.name));
}
export function maybeAskBackup() {
  const today = L.todayStr();
  if (!L.backupDue(state.prefs, today) || document.querySelector('.backup-ask')) return;
  const key = L.backupPeriodKey(state.prefs.backupReminder, today);
  const close = () => overlay.remove();
  const answer = (yes) => {
    close();
    if (yes) shareBackup();
    setPrefs({ backupAsked: key });
  };
  const overlay = el('div', { class: 'overlay backup-ask', role: 'dialog', 'aria-label': t('backup') },
    el('div', { class: 'dialog' },
      el('div', { class: 'dlg-title', text: t('backup') }),
      el('p', { class: 'dlg-text', text: state.prefs.backupReminder === 'weekly' ? t('newWeek') : t('newMonth') }),
      el('div', { class: 'dlg-stack' },
        el('button', { type: 'button', class: 'btn primary wide', text: t('yes'), onclick: () => answer(true) }),
        el('button', { type: 'button', class: 'btn wide', text: t('no'), onclick: () => answer(false) }))));
  document.body.append(overlay);
}
const HINT_KEY = 'habits.installHintSeen';
function runsAsApp() {
  try {
    return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  } catch { return false; }
}
export function maybeShowInstallHint() {
  let seen = false;
  try { seen = localStorage.getItem(HINT_KEY) === '1'; } catch {  }
  if (seen || runsAsApp() || document.querySelector('.install-hint')) return false;
  const step = (browser, text) => el('p', { class: 'dlg-text' }, el('b', { text: browser }), ` ${text}`);
  const overlay = el('div', { class: 'overlay install-hint', role: 'dialog', 'aria-label': 'Add to Home Screen' },
    el('div', { class: 'dialog' },
      el('div', { class: 'dlg-title', text: 'Add Habits to your Home Screen' }),
      step('iPhone · Safari:', 'Tap Share (behind ••• if hidden) → Add to Home Screen → keep “Open as Web App” on → Add.'),
      step('iPhone · Chrome:', 'Tap the Share icon in the address bar → Add to Home Screen → Add.'),
      step('Android · Chrome:', 'Tap ⋮ → Add to home screen (or Install app) → Install.'),
      el('div', { class: 'dlg-stack' },
        el('button', {
          type: 'button', class: 'btn primary wide', text: 'Got it',
          onclick: () => {
            try { localStorage.setItem(HINT_KEY, '1'); } catch {  }
            overlay.remove();
          },
        }))));
  document.body.append(overlay);
  return true;
}
