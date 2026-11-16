import * as L from './logic.js';
import { state, habit, setHabit, setStartDay, replaceAll, clearAll, setPrefs, tileColor, TILE_COLORS } from './state.js';
import { parseImport } from './data.js';
import { shareBackup } from './backup.js';
import { el, numberDialog, toast } from './ui.js';
import { t, LANGS, getLang, setLang } from './i18n.js';
export function renderSettings(root, info) {
  root.replaceChildren(
    startCard(root, info),
    ...L.SLOTS.map((slot) => habitCard(slot, root, info)),
    reminderCard(),
    dataCard(root, info),
    el('p', { class: 'footnote' },
      el('span', { text: `Habits ${info.version}` }),
      namaste(),
      info.persisted === false ? el('span', { class: 'footnote-warn', text: t('storageNote') }) : null));
}
function namaste() {
  const p = (d) => el('path', { d });
  return el('svg', { viewBox: '0 0 24 24', class: 'namaste', 'aria-hidden': 'true' },
    p('M11.45 3.2C11.45 2.3 10.7 2 10.2 2.8C9.9 3.3 9.8 3.9 9.6 4.7L8.6 9.4C8.4 10.4 7.9 11.3 7.1 12.1L5.6 13.8C5.1 14.4 5.2 15.2 5.8 15.6L7.4 16.9C8 17.4 8.8 17.3 9.3 16.8C10.6 15.3 11.45 14 11.45 12.4Z'),
    p('M8.7 9.3C9.8 9.6 10.6 10.6 10.7 12'),
    p('M6.4 14.2L8.6 16'),
    p('M12.55 3.2C12.55 2.3 13.3 2 13.8 2.8C14.1 3.3 14.2 3.9 14.4 4.7L15.4 9.4C15.6 10.4 16.1 11.3 16.9 12.1L18.4 13.8C18.9 14.4 18.8 15.2 18.2 15.6L16.6 16.9C16 17.4 15.2 17.3 14.7 16.8C13.4 15.3 12.55 14 12.55 12.4Z'),
    p('M15.3 9.3C14.2 9.6 13.4 10.6 13.3 12'),
    p('M17.6 14.2L15.4 16'));
}
function startCard(root, info) {
  const today = L.todayStr();
  const cur = getLang();
  const langBtn = (l) => el('button', {
    class: cur === l.code ? 'active' : '', role: 'radio', 'aria-checked': String(cur === l.code), text: l.name, lang: l.code,
    onclick: () => {
      if (l.code === cur) return;
      setLang(l.code);
      info.onLanguage();
    },
  });
  return el('section', { class: 'card' },
    el('div', { class: 'field first' },
      el('span', { class: 'field-lbl', text: t('language') }),
      el('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': t('language') }, ...LANGS.map(langBtn))),
    el('label', { class: 'field' },
      el('span', { class: 'field-lbl', text: t('start') }),
      el('input', {
        type: 'date', value: state.settings.startDay, max: today, 'aria-label': t('start'),
        onchange: async (e) => {
          const v = e.target.value;
          if (!L.isDay(v) || v > today) { e.target.value = state.settings.startDay; toast(t('chooseDate')); return; }
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
        if (!val && !allowEmpty) { e.target.value = v[key]; toast(t('cannotBeEmpty', label)); return; }
        if (val !== v[key]) { await setHabit(slot, { [key]: val }); rerender(); }
      },
    }));
  const setBound = async (key, val) => {
    val = Math.min(max, Math.max(0, val));
    if (val === v[key]) return;
    const p = { [key]: val };
    if (amt) {
      const n = { lo: v.lo, target: v.target, hi: v.hi, [key]: val };
      if (key === 'lo') { n.target = Math.max(n.target, val); n.hi = Math.max(n.hi, n.target); }
      if (key === 'hi') { n.target = Math.min(n.target, val); n.lo = Math.min(n.lo, n.target); }
      if (key === 'target') { n.lo = Math.min(n.lo, val); n.hi = Math.max(n.hi, val); }
      Object.assign(p, n);
    }
    await setHabit(slot, p);
    rerender();
  };
  const bound = (key, label) => {
    const valBtn = el('button', {
      class: `day-value num${amt ? ' editable' : ''}`, text: show(v[key]),
      'aria-label': `${label} ${show(v[key])}${amt ? t('tapToEnter') : ''}`,
      onclick: amt ? async () => {
        const txt = await numberDialog(`${v.shortName}: ${label}`, show(v[key]));
        if (txt === null) return;
        const n = L.parseH(txt);
        if (n === null || n > max) { toast(t('numberRange')); return; }
        setBound(key, n);
      } : null,
    });
    return el('div', { class: 'field' },
      el('span', { class: 'field-lbl', text: label }),
      el('div', { class: 'stepper small' },
        el('button', { class: 'step-btn', 'aria-label': t('decrease', label), text: '−', disabled: v[key] <= 0, onclick: () => setBound(key, v[key] - step) }),
        valBtn,
        el('button', { class: 'step-btn', 'aria-label': t('increase', label), text: '+', disabled: v[key] >= max, onclick: () => setBound(key, v[key] + step) })));
  };
  const swatches = el('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('tileColorFor', v.shortName) },
    ...TILE_COLORS.map((c) => {
      const on = tileColor(slot) === c.value;
      const name = t('colors')[c.name];
      const b = el('button', {
        class: `swatch${on ? ' on' : ''}`, role: 'radio', 'aria-checked': String(on), 'aria-label': name, title: name,
        onclick: async () => { await setPrefs({ colors: { [slot]: c.value } }); rerender(); },
      });
      b.style.background = c.value;
      return b;
    }));
  const card = el('section', { class: 'card settings-card', 'aria-label': t('settingsFor', v.shortName) },
    el('div', { class: 'section-title', text: `${v.shortName} · ${amt ? t('daily') : t('monthly')}` }),
    text(t('name'), 'shortName', 3, (s) => s.toUpperCase()),
    text(t('note'), 'note', L.NOTE_MAX, (s) => s, true),
    ...(amt
      ? [bound('target', t('targetDay')), bound('lo', t('greenBelow')), bound('hi', t('redAbove'))]
      : [bound('target', t('targetMonth'))]),
    el('div', { class: 'field' },
      el('span', { class: 'field-lbl', text: t('tileColor') }),
      swatches));
  card.style.background = tileColor(slot);
  return card;
}
function reminderCard() {
  return el('section', { class: 'card' },
    el('div', { class: 'section-title', text: t('reminder') }),
    el('p', { class: 'hint lines', text: t('reminderHint') }));
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
        if (!confirm(t('importConfirm', f.name, data.days.length, data.checks.length))) return;
        await replaceAll(data);
        if (data.language) setLang(data.language);
        toast(t('importDone'));
        info.onLanguage();
      } catch (err) {
        alert(t('importFailed', err.message));
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
    el('div', { class: 'section-title', text: t('data') }),
    el('p', { class: 'hint', text: t('dataHint') }),
    el('div', { class: 'field first stack' },
      el('span', { class: 'field-lbl', text: t('exportReminder') }),
      el('div', { class: 'segmented small', role: 'radiogroup', 'aria-label': t('exportReminder') },
        modeBtn('never', t('never')), modeBtn('weekly', t('weekly')), modeBtn('monthly', t('monthly')))),
    el('button', { class: 'btn wide', text: t('exportData'), onclick: shareBackup }),
    el('button', { class: 'btn wide', text: t('importData'), onclick: () => fileInput.click() }),
    fileInput,
    el('button', {
      class: 'btn wide danger', text: t('deleteAll'),
      onclick: async () => {
        if (!confirm(t('deleteConfirm'))) return;
        await clearAll();
        toast(t('deleted'));
        renderSettings(root, info);
      },
    }));
}
