import * as L from './logic.js';
import { state, allDays, setPrefs } from './state.js';
import { buildExport, exportFileName } from './data.js';
import { el, toast } from './ui.js';
let appVersion = '';
export function setAppVersion(v) { appVersion = v; }
export function useShareSheet() {
  return typeof navigator.share === 'function' && navigator.maxTouchPoints > 0;
}
export function makeFile() {
  const obj = buildExport({ days: allDays(), checks: state.checks.map((c) => c.day), settings: state.settings, prefs: state.prefs },
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
  try { file = makeFile(); } catch (err) { alert(`Export failed: ${err.message}`); return; }
  if (useShareSheet() && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    navigator.share({ files: [file] }).catch((e) => {
      if (e && e.name === 'AbortError') return;
      download(file);
    });
    return;
  }
  download(file);
  toast(`Saving ${file.name}.`);
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
  const overlay = el('div', { class: 'overlay backup-ask', role: 'dialog', 'aria-label': 'Backup' },
    el('div', { class: 'dialog' },
      el('div', { class: 'dlg-title', text: 'Backup' }),
      el('p', { class: 'dlg-text', text: `${state.prefs.backupReminder === 'weekly' ? 'New week' : 'New month'} – export now?` }),
      el('div', { class: 'dlg-stack' },
        el('button', { type: 'button', class: 'btn primary wide', text: 'Yes', onclick: () => answer(true) }),
        el('button', { type: 'button', class: 'btn wide', text: 'No', onclick: () => answer(false) }))));
  document.body.append(overlay);
}
