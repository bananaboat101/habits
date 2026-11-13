import * as L from './logic.js';
import { state, habit, setHabit, setStartDay, replaceAll, clearAll, setPrefs, tileColor, TILE_COLORS } from './state.js';
import { parseImport } from './data.js';
import { shareBackup } from './backup.js';
import { el, numberDialog, toast } from './ui.js';
export function renderSettings(root, info) {
  root.replaceChildren(
    startCard(root, info),
    ...L.SLOTS.map((slot) => habitCard(slot, root, info)),
    reminderCard(),
    dataCard(root, info),
    el('p', { class: 'footnote' },
      el('span', { text: `Habits ${info.version} · Made for your journey · C.` }),
      info.persisted === false ? el('span', { class: 'footnote-warn', text: 'Note: storage is not confirmed as persistent – add the app to your Home Screen and export regularly.' }) : null));
}
function startCard(root, info) {
  const today = L.todayStr();
  return el('section', { class: 'card' },
    el('label', { class: 'field first' },
      el('span', { class: 'field-lbl', text: 'Tracking start' }),
      el('input', {
        type: 'date', value: state.settings.startDay, max: today, 'aria-label': 'Tracking start',
        onchange: async (e) => {
          const v = e.target.value;
          if (!L.isDay(v) || v > today) { e.target.value = state.settings.startDay; toast('Please choose a date up to today.'); return; }
          if (v !== state.settings.startDay) { await setStartDay(v); renderSettings(root, info); }
        },
      })));
}
function habitCard(slot, root, info) {
  const v = habit(slot);
  const amt = slot === 'h1';
  const rerender = () => renderSettings(root, info);
  const step = amt ? L.AMOUNT_STEP : 1;
  const max = L.maxFor(slot);
  const show = (x) => (amt ? L.fmtH(x, true) : String(x));
  const text = (label, key, maxLen, transform = (s) => s, allowEmpty = false) => el('label', { class: 'field' },
    el('span', { class: 'field-lbl', text: label }),
    el('input', {
      type: 'text', value: v[key], maxlength: maxLen, autocomplete: 'off', autocapitalize: key === 'shortName' ? 'characters' : 'sentences',
      onchange: async (e) => {
        const val = transform(e.target.value.trim()).slice(0, maxLen);
        if (!val && !allowEmpty) { e.target.value = v[key]; toast(`${label} cannot be empty.`); return; }
        if (val !== v[key]) { await setHabit(slot, { [key]: val }); rerender(); }
      },
    }));
  const setBound = async (key, t) => {
    t = Math.min(max, Math.max(0, t));
    if (t === v[key]) return;
    const p = { [key]: t };
    if (amt) {
      const n = { lo: v.lo, target: v.target, hi: v.hi, [key]: t };
      if (key === 'lo') { n.target = Math.max(n.target, t); n.hi = Math.max(n.hi, n.target); }
      if (key === 'hi') { n.target = Math.min(n.target, t); n.lo = Math.min(n.lo, n.target); }
      if (key === 'target') { n.lo = Math.min(n.lo, t); n.hi = Math.max(n.hi, t); }
      Object.assign(p, n);
    }
    await setHabit(slot, p);
    rerender();
  };
  const bound = (key, label) => {
    const valBtn = el('button', {
      class: `day-value num${amt ? ' editable' : ''}`, text: show(v[key]),
      'aria-label': `${label} ${show(v[key])}${amt ? ', tap to enter' : ''}`,
      onclick: amt ? async () => {
        const txt = await numberDialog(`${v.shortName}: ${label}`, show(v[key]));
        if (txt === null) return;
        const t = L.parseH(txt);
        if (t === null || t > max) { toast('Please enter a number from 0 to 99 with up to two decimals.'); return; }
        setBound(key, t);
      } : null,
    });
    return el('div', { class: 'field' },
      el('span', { class: 'field-lbl', text: label }),
      el('div', { class: 'stepper small' },
        el('button', { class: 'step-btn', 'aria-label': `Decrease ${label}`, text: '−', disabled: v[key] <= 0, onclick: () => setBound(key, v[key] - step) }),
        valBtn,
        el('button', { class: 'step-btn', 'aria-label': `Increase ${label}`, text: '+', disabled: v[key] >= max, onclick: () => setBound(key, v[key] + step) })));
  };
  const swatches = el('div', { class: 'swatches', role: 'radiogroup', 'aria-label': `Tile color ${v.shortName}` },
    ...TILE_COLORS.map((c) => {
      const on = tileColor(slot) === c.value;
      const b = el('button', {
        class: `swatch${on ? ' on' : ''}`, role: 'radio', 'aria-checked': String(on), 'aria-label': c.name, title: c.name,
        onclick: async () => { await setPrefs({ colors: { [slot]: c.value } }); rerender(); },
      });
      b.style.background = c.value;
      return b;
    }));
  const card = el('section', { class: 'card settings-card', 'aria-label': `Settings ${v.shortName}` },
    el('div', { class: 'section-title', text: `${v.shortName} · ${amt ? 'Daily' : 'Monthly'}` }),
    text('Name', 'shortName', 3, (s) => s.toUpperCase()),
    text('Note', 'note', L.NOTE_MAX, (s) => s, true),
    ...(amt
      ? [bound('target', 'Target'), bound('lo', 'Green below'), bound('hi', 'Red above')]
      : [bound('target', 'Target per month')]),
    el('div', { class: 'field' },
      el('span', { class: 'field-lbl', text: 'Tile color' }),
      swatches));
  card.style.background = tileColor(slot);
  return card;
}
function reminderCard() {
  return el('section', { class: 'card' },
    el('div', { class: 'section-title', text: 'Reminder' }),
    el('p', { class: 'hint', text: 'Set up a daily reminder via Apple Shortcuts: Automation → Time of Day → Show Notification.' }));
}
function dataCard(root, info) {
  const fileInput = el('input', {
    type: 'file', accept: '.json,application/json,text/plain', class: 'hidden',
    onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const data = parseImport(await f.text(), L.todayStr());
        if (!confirm(`Import “${f.name}”?\n${data.days.length} values, ${data.checks.length} confirmed days.\nAll current data will be replaced.`)) return;
        await replaceAll(data);
        toast('Import complete.');
        renderSettings(root, info);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    },
  });
  const mode = state.prefs.backupReminder;
  const modeBtn = (m, label) => el('button', {
    class: mode === m ? 'active' : '', role: 'radio', 'aria-checked': String(mode === m), text: label,
    onclick: async () => {
      if (m === mode) return;
      await setPrefs({ backupReminder: m, backupAsked: L.backupPeriodKey(m, L.todayStr()) });
      renderSettings(root, info);
    },
  });
  return el('section', { class: 'card' },
    el('div', { class: 'section-title', text: 'Data' }),
    el('p', { class: 'hint', text: 'Your data is stored only on this iPhone. The export is a readable JSON file with one line per day.' }),
    el('div', { class: 'field first stack' },
      el('span', { class: 'field-lbl', text: 'Export reminder' }),
      el('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': 'Export reminder' },
        modeBtn('never', 'Never'), modeBtn('weekly', 'Weekly'), modeBtn('monthly', 'Monthly'))),
    el('button', { class: 'btn wide', text: 'Export data', onclick: shareBackup }),
    el('button', { class: 'btn wide', text: 'Import data', onclick: () => fileInput.click() }),
    fileInput,
    el('button', {
      class: 'btn wide danger', text: 'Delete all data',
      onclick: async () => {
        if (!confirm('Delete all entries and settings on this device? This cannot be undone.')) return;
        await clearAll();
        toast('All data deleted.');
        renderSettings(root, info);
      },
    }));
}
